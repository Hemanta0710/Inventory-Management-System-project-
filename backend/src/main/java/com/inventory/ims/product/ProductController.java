package com.inventory.ims.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    public List<Product> findAll() {
        return productRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@Valid @RequestBody CreateProductRequest request) {
        Product product = new Product();
        product.setSku(request.sku());
        product.setName(request.name());
        product.setQuantity(request.quantity());
        product.setReorderLevel(request.reorderLevel());
        product.setUnitPrice(request.unitPrice());
        product.setImageUrl(request.imageUrl());
        return productRepository.save(product);
    }

    @PutMapping("/{productId}")
    public Product update(@PathVariable Long productId, @Valid @RequestBody UpdateProductRequest request) {
        Long requiredProductId = Objects.requireNonNull(productId, "productId is required");
        Product product = productRepository.findById(requiredProductId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        product.setSku(request.sku());
        product.setName(request.name());
        product.setQuantity(request.quantity());
        product.setReorderLevel(request.reorderLevel());
        product.setUnitPrice(request.unitPrice());
        product.setImageUrl(request.imageUrl());
        return productRepository.save(product);
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long productId) {
        Long requiredProductId = Objects.requireNonNull(productId, "productId is required");
        if (!productRepository.existsById(requiredProductId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        productRepository.deleteById(requiredProductId);
    }

    public record CreateProductRequest(
            @NotBlank String sku,
            @NotBlank String name,
            @NotNull @Min(0) Integer quantity,
            @NotNull @Min(1) Integer reorderLevel,
            @NotNull BigDecimal unitPrice,
            String imageUrl
    ) {
    }

        public record UpdateProductRequest(
            @NotBlank String sku,
            @NotBlank String name,
            @NotNull @Min(0) Integer quantity,
            @NotNull @Min(1) Integer reorderLevel,
            @NotNull BigDecimal unitPrice,
            String imageUrl
        ) {
        }
}
