package com.inventory.ims.cart;

import java.math.BigDecimal;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Validated
@RestController
@RequestMapping("/api/carts")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CartService.CartDetailsResponse createCart(@Valid @RequestBody CreateCartRequest request) {
        return cartService.createCart(request.employeeName());
    }

    @GetMapping("/{cartId}")
    public CartService.CartDetailsResponse getCart(@PathVariable Long cartId) {
        return cartService.getCart(cartId);
    }

    @PostMapping("/{cartId}/items")
    public CartService.CartDetailsResponse addItem(
            @PathVariable Long cartId,
            @Valid @RequestBody AddCartItemRequest request
    ) {
        return cartService.addItem(cartId, request.productId(), request.quantity());
    }

    @PostMapping("/{cartId}/reserve")
    public CartService.CartDetailsResponse reserve(@PathVariable Long cartId) {
        return cartService.reserveCart(cartId);
    }

    @PostMapping("/{cartId}/checkout")
    public CartService.PaymentBillResponse checkout(
            @PathVariable Long cartId,
            @Valid @RequestBody CheckoutRequest request
    ) {
        return cartService.checkoutCart(cartId, request.paymentMethod(), request.amountTendered());
    }

    public record CreateCartRequest(@NotBlank String employeeName) {
    }

    public record AddCartItemRequest(
            @NotNull Long productId,
            @NotNull @Min(1) Integer quantity
    ) {
    }

        public record CheckoutRequest(
            @NotBlank String paymentMethod,
            @NotNull @Min(0) BigDecimal amountTendered
        ) {
        }
}
