package com.inventory.ims.analytics;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Validated
@RestController
@RequestMapping("/api/analytics")
public class SalesAnalyticsController {

    private final SalesAnalyticsService salesAnalyticsService;

    public SalesAnalyticsController(SalesAnalyticsService salesAnalyticsService) {
        this.salesAnalyticsService = salesAnalyticsService;
    }

    @GetMapping("/sales-by-product")
    public List<SalesAnalyticsService.SalesByProductResponse> salesByProduct(
            @RequestParam(defaultValue = "8") @Min(1) @Max(20) int limit
    ) {
        return salesAnalyticsService.salesByProduct(limit);
    }

    @GetMapping("/sales-report")
    public List<SalesAnalyticsService.SalesReportRowResponse> salesReport(
            @RequestParam(defaultValue = "daily") String period
    ) {
        return salesAnalyticsService.salesReport(period);
    }
}
