package com.inventory.ims.alert;

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
@RequestMapping("/api/alerts")
public class LowStockAlertController {

    private final LowStockAlertService lowStockAlertService;

    public LowStockAlertController(LowStockAlertService lowStockAlertService) {
        this.lowStockAlertService = lowStockAlertService;
    }

    @GetMapping("/low-stock")
    public List<LowStockAlertService.LowStockAlertResponse> lowStockAlerts(
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        return lowStockAlertService.getLowStockAlerts(limit);
    }
}
