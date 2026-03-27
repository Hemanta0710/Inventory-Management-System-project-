package com.inventory.ims.alert;

import java.util.List;

import org.springframework.stereotype.Service;

import com.inventory.ims.product.Product;
import com.inventory.ims.product.ProductRepository;

@Service
public class LowStockAlertService {

    private final ProductRepository productRepository;

    public LowStockAlertService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<LowStockAlertResponse> getLowStockAlerts(int limit) {
        int safeLimit = Math.max(1, limit);

        return productRepository.findLowStockProducts()
                .stream()
                .limit(safeLimit)
                .map(this::toResponse)
                .toList();
    }

    private LowStockAlertResponse toResponse(Product product) {
        int deficit = product.getReorderLevel() - product.getQuantity();
        String severity;

        if (product.getQuantity() == 0) {
            severity = "CRITICAL";
        } else if (deficit >= 10) {
            severity = "HIGH";
        } else {
            severity = "MEDIUM";
        }

        return new LowStockAlertResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getQuantity(),
                product.getReorderLevel(),
                deficit,
                severity
        );
    }

    public record LowStockAlertResponse(
            Long productId,
            String sku,
            String name,
            Integer quantity,
            Integer reorderLevel,
            Integer deficit,
            String severity
    ) {
    }
}
