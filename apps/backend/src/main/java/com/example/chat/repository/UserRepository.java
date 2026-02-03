package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import com.example.chat.model.*;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);
}
