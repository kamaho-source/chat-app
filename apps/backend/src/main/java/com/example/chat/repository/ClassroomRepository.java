package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import com.example.chat.model.*;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
  Optional<Classroom> findByCode(String code);
}
