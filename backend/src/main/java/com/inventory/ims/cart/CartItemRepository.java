package com.inventory.ims.cart;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByCartId(Long cartId);

    List<CartItem> findByCartIdIn(List<Long> cartIds);

    @Query("SELECT ci FROM CartItem ci JOIN ci.cart c WHERE c.status = :status")
    List<CartItem> findByCartStatus(@Param("status") CartStatus status);
}
