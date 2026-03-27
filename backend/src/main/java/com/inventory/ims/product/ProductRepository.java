package com.inventory.ims.product;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface ProductRepository extends JpaRepository<Product, Long> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT p FROM Product p WHERE p.id = :id")
	Optional<Product> findByIdForUpdate(Long id);

	@Query("""
			SELECT p
			FROM Product p
			WHERE p.quantity <= p.reorderLevel
			ORDER BY (p.reorderLevel - p.quantity) DESC, p.name ASC
			""")
	List<Product> findLowStockProducts();
}
