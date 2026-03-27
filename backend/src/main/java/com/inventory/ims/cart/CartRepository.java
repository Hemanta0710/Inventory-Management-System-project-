package com.inventory.ims.cart;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CartRepository extends JpaRepository<Cart, Long> {

	List<Cart> findByStatusAndUpdatedAtBetween(CartStatus status, LocalDateTime startInclusive, LocalDateTime endExclusive);
}
