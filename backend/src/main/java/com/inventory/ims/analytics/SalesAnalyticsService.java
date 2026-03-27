package com.inventory.ims.analytics;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inventory.ims.cart.Cart;
import com.inventory.ims.cart.CartItem;
import com.inventory.ims.cart.CartItemRepository;
import com.inventory.ims.cart.CartRepository;
import com.inventory.ims.cart.CartStatus;
import com.inventory.ims.product.Product;
import com.inventory.ims.product.ProductRepository;

@Service
public class SalesAnalyticsService {

    private final CartItemRepository cartItemRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;

    public SalesAnalyticsService(
            CartItemRepository cartItemRepository,
            CartRepository cartRepository,
            ProductRepository productRepository
    ) {
        this.cartItemRepository = cartItemRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<SalesByProductResponse> salesByProduct(int limit) {
        List<CartItem> completedItems = cartItemRepository.findByCartStatus(CartStatus.COMPLETED);
        if (completedItems.isEmpty()) {
            return List.of();
        }

        Map<Long, Product> productById = productRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(Product::getId, product -> product));

        Map<Long, SalesAccumulator> byProduct = new HashMap<>();
        for (CartItem item : completedItems) {
            Product product = productById.get(item.getProductId());
            if (product == null) {
                continue;
            }

            SalesAccumulator accumulator = byProduct.computeIfAbsent(item.getProductId(), key -> new SalesAccumulator(
                    product.getId(),
                    product.getSku(),
                    product.getName()
            ));

            accumulator.unitsSold += item.getQuantity();
            accumulator.revenue = accumulator.revenue.add(
                    item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
            );
        }

        List<SalesByProductResponse> rows = new ArrayList<>();
        for (SalesAccumulator value : byProduct.values()) {
            rows.add(new SalesByProductResponse(
                    value.productId,
                    value.sku,
                    value.name,
                    value.unitsSold,
                    value.revenue
            ));
        }

        rows.sort(Comparator.comparingLong(SalesByProductResponse::unitsSold).reversed());
        return rows.stream().limit(limit).toList();
    }

    @Transactional(readOnly = true)
    public List<SalesReportRowResponse> salesReport(String period) {
        ReportPeriod reportPeriod = ReportPeriod.from(period);
        LocalDate today = LocalDate.now();

        List<Bucket> buckets = switch (reportPeriod) {
            case DAILY -> buildDailyBuckets(today, 7);
            case WEEKLY -> buildWeeklyBuckets(today, 8);
            case MONTHLY -> buildMonthlyBuckets(today, 6);
        };

        if (buckets.isEmpty()) {
            return List.of();
        }

        LocalDateTime start = buckets.get(0).start();
        LocalDateTime end = buckets.get(buckets.size() - 1).end();

        List<Cart> completedCarts = cartRepository.findByStatusAndUpdatedAtBetween(CartStatus.COMPLETED, start, end);
        if (completedCarts.isEmpty()) {
            return buckets.stream()
                    .map(bucket -> new SalesReportRowResponse(bucket.label(), 0, BigDecimal.ZERO, 0))
                    .toList();
        }

        List<Long> cartIds = completedCarts.stream().map(Cart::getId).toList();
        List<CartItem> cartItems = cartItemRepository.findByCartIdIn(cartIds);

        Map<Long, BigDecimal> totalByCart = new HashMap<>();
        Map<Long, Integer> unitsByCart = new HashMap<>();
        for (CartItem item : cartItems) {
            BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            totalByCart.merge(item.getCart().getId(), lineTotal, BigDecimal::add);
            Long cartId = Objects.requireNonNull(item.getCart().getId(), "cartId is required");
            Integer quantity = item.getQuantity();
            if (quantity == null) {
                quantity = 0;
            }
            unitsByCart.merge(cartId, quantity, (left, right) -> left + right);
        }

        List<MutableReportRow> rows = buckets.stream()
                .map(bucket -> new MutableReportRow(bucket.label()))
                .toList();

        for (Cart cart : completedCarts) {
            int bucketIndex = findBucketIndex(buckets, cart.getUpdatedAt());
            if (bucketIndex < 0) {
                continue;
            }

            MutableReportRow row = rows.get(bucketIndex);
            row.orderCount += 1;
            row.unitsSold += unitsByCart.getOrDefault(cart.getId(), 0);
            row.revenue = row.revenue.add(totalByCart.getOrDefault(cart.getId(), BigDecimal.ZERO));
        }

        return rows.stream()
                .map(row -> new SalesReportRowResponse(
                        row.label,
                        row.orderCount,
                        row.revenue.setScale(2, RoundingMode.HALF_UP),
                        row.unitsSold
                ))
                .toList();
    }

    private int findBucketIndex(List<Bucket> buckets, LocalDateTime timestamp) {
        for (int i = 0; i < buckets.size(); i++) {
            Bucket bucket = buckets.get(i);
            if (!timestamp.isBefore(bucket.start()) && timestamp.isBefore(bucket.end())) {
                return i;
            }
        }
        return -1;
    }

    private List<Bucket> buildDailyBuckets(LocalDate today, int days) {
        List<Bucket> buckets = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            buckets.add(new Bucket(day.atStartOfDay(), day.plusDays(1).atStartOfDay(), formatter.format(day)));
        }
        return buckets;
    }

    private List<Bucket> buildWeeklyBuckets(LocalDate today, int weeks) {
        List<Bucket> buckets = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM");
        LocalDate thisWeekStart = today.with(DayOfWeek.MONDAY);
        for (int i = weeks - 1; i >= 0; i--) {
            LocalDate weekStart = thisWeekStart.minusWeeks(i);
            LocalDate weekEnd = weekStart.plusDays(7);
            String label = formatter.format(weekStart) + " - " + formatter.format(weekEnd.minusDays(1));
            buckets.add(new Bucket(weekStart.atStartOfDay(), weekEnd.atStartOfDay(), label));
        }
        return buckets;
    }

    private List<Bucket> buildMonthlyBuckets(LocalDate today, int months) {
        List<Bucket> buckets = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
        YearMonth thisMonth = YearMonth.from(today);
        for (int i = months - 1; i >= 0; i--) {
            YearMonth month = thisMonth.minusMonths(i);
            buckets.add(new Bucket(month.atDay(1).atStartOfDay(), month.plusMonths(1).atDay(1).atStartOfDay(), formatter.format(month.atDay(1))));
        }
        return buckets;
    }

    private record Bucket(LocalDateTime start, LocalDateTime end, String label) {
    }

    private static class MutableReportRow {
        private final String label;
        private int orderCount;
        private int unitsSold;
        private BigDecimal revenue = BigDecimal.ZERO;

        private MutableReportRow(String label) {
            this.label = label;
        }
    }

    private static class SalesAccumulator {
        private final Long productId;
        private final String sku;
        private final String name;
        private long unitsSold;
        private BigDecimal revenue = BigDecimal.ZERO;

        private SalesAccumulator(Long productId, String sku, String name) {
            this.productId = productId;
            this.sku = sku;
            this.name = name;
        }
    }

    public record SalesByProductResponse(
            Long productId,
            String sku,
            String name,
            long unitsSold,
            BigDecimal revenue
    ) {
    }

    public record SalesReportRowResponse(
            String label,
            int orderCount,
            BigDecimal revenue,
            int unitsSold
    ) {
    }

    private enum ReportPeriod {
        DAILY,
        WEEKLY,
        MONTHLY;

        private static ReportPeriod from(String value) {
            if (value == null) {
                return DAILY;
            }

            return switch (value.trim().toUpperCase()) {
                case "WEEKLY" -> WEEKLY;
                case "MONTHLY" -> MONTHLY;
                default -> DAILY;
            };
        }
    }
}
