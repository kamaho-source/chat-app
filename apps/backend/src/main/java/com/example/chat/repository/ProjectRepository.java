package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.chat.model.*;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}
