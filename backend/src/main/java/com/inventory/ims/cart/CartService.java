package com.inventory.ims.cart;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.inventory.ims.product.Product;
import com.inventory.ims.product.ProductRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
public class CartService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.10");

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    public CartService(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository
    ) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public CartDetailsResponse createCart(String employeeName) {
        Cart cart = new Cart();
        cart.setEmployeeName(employeeName);
        cart.setStatus(CartStatus.DRAFT);

        Cart saved = cartRepository.save(cart);
        return toDetails(saved, List.of());
    }

    @Transactional(readOnly = true)
    public CartDetailsResponse getCart(Long cartId) {
        Cart cart = getExistingCart(cartId);
        List<CartItem> items = cartItemRepository.findByCartId(cartId);
        return toDetails(cart, items);
    }

    @Transactional
    public CartDetailsResponse addItem(Long cartId, Long productId, Integer quantity) {
        Cart cart = getExistingCart(cartId);
        if (cart.getStatus() != CartStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only DRAFT cart can be updated");
        }

        Long requiredProductId = Objects.requireNonNull(productId, "productId is required");
        Product product = productRepository.findById(requiredProductId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));

        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProductId(product.getId());
        item.setQuantity(quantity);
        item.setUnitPrice(product.getUnitPrice());
        cartItemRepository.save(item);

        List<CartItem> items = cartItemRepository.findByCartId(cartId);
        return toDetails(cart, items);
    }

    @Transactional
    public CartDetailsResponse reserveCart(Long cartId) {
        Cart cart = getExistingCart(cartId);
        if (cart.getStatus() != CartStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is already reserved or completed");
        }

        List<CartItem> items = cartItemRepository.findByCartId(cartId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reserve an empty cart");
        }

        for (CartItem item : items) {
            Product product = productRepository.findByIdForUpdate(item.getProductId())
                    .orElseThrow(() -> new EntityNotFoundException("Product not found while reserving"));

            if (product.getQuantity() < item.getQuantity()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Insufficient stock for SKU " + product.getSku()
                );
            }

            product.setQuantity(product.getQuantity() - item.getQuantity());
            productRepository.save(product);
        }

        cart.setStatus(CartStatus.RESERVED);
        cartRepository.save(cart);

        return toDetails(cart, items);
    }

    @Transactional
    public PaymentBillResponse checkoutCart(Long cartId, String paymentMethod, BigDecimal amountTendered) {
        Cart cart = getExistingCart(cartId);
        if (cart.getStatus() != CartStatus.RESERVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart must be RESERVED before checkout");
        }

        List<CartItem> items = cartItemRepository.findByCartId(cartId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot checkout an empty cart");
        }

        BigDecimal subtotal = items.stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

        BigDecimal provided = amountTendered == null ? grandTotal : amountTendered.setScale(2, RoundingMode.HALF_UP);
        if (provided.compareTo(grandTotal) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount tendered is less than total bill amount");
        }

        Map<Long, Product> productsById = new HashMap<>();
        List<Long> productIds = items.stream()
            .map(CartItem::getProductId)
            .filter(Objects::nonNull)
            .toList();
        for (Long productId : productIds) {
            Long requiredProductId = Objects.requireNonNull(productId, "productId in cart item is required");
            productRepository.findById(requiredProductId)
                    .ifPresent(product -> productsById.put(product.getId(), product));
        }

        List<BillLineResponse> lines = items.stream()
                .map(item -> {
                    Product product = productsById.get(item.getProductId());
                    String sku = product != null ? product.getSku() : "UNKNOWN";
                    String name = product != null ? product.getName() : "Unknown Product";
                    BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                            .setScale(2, RoundingMode.HALF_UP);
                    return new BillLineResponse(
                            item.getProductId(),
                            sku,
                            name,
                            item.getQuantity(),
                            item.getUnitPrice(),
                            lineTotal
                    );
                })
                .toList();

        cart.setStatus(CartStatus.COMPLETED);
        cartRepository.save(cart);

        BigDecimal change = provided.subtract(grandTotal).setScale(2, RoundingMode.HALF_UP);
        String billNumber = "BILL-" + cart.getId() + "-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));

        return new PaymentBillResponse(
                billNumber,
                cart.getId(),
                cart.getEmployeeName(),
                paymentMethod,
                lines,
                subtotal,
                tax,
                grandTotal,
                provided,
                change,
                LocalDateTime.now()
        );
    }

    private Cart getExistingCart(Long cartId) {
        Long requiredCartId = Objects.requireNonNull(cartId, "cartId is required");
        return cartRepository.findById(requiredCartId)
                .orElseThrow(() -> new EntityNotFoundException("Cart not found"));
    }

    private CartDetailsResponse toDetails(Cart cart, List<CartItem> items) {
        List<CartItemResponse> itemResponses = items.stream()
                .map(i -> new CartItemResponse(i.getId(), i.getProductId(), i.getQuantity(), i.getUnitPrice()))
                .toList();

        BigDecimal total = itemResponses.stream()
                .map(i -> i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartDetailsResponse(
                cart.getId(),
                cart.getEmployeeName(),
                cart.getStatus().name(),
                itemResponses,
                total
        );
    }

    public record CartItemResponse(
            Long id,
            Long productId,
            Integer quantity,
            BigDecimal unitPrice
    ) {
    }

    public record CartDetailsResponse(
            Long cartId,
            String employeeName,
            String status,
            List<CartItemResponse> items,
            BigDecimal total
    ) {
    }

        public record BillLineResponse(
            Long productId,
            String sku,
            String productName,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
        ) {
        }

        public record PaymentBillResponse(
            String billNumber,
            Long cartId,
            String employeeName,
            String paymentMethod,
            List<BillLineResponse> lines,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal grandTotal,
            BigDecimal amountTendered,
            BigDecimal change,
            LocalDateTime paidAt
        ) {
        }
}
