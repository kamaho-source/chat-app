package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.example.chat.model.*;

public interface ProjectUserRepository extends JpaRepository<ProjectUser, Long> {
  List<ProjectUser> findByProjectId(Long projectId);
  Optional<ProjectUser> findByProjectIdAndUserId(Long projectId, Long userId);
}
