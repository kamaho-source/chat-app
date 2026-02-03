package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.example.chat.model.*;

public interface TaskRepository extends JpaRepository<Task, Long> {
  List<Task> findByProjectId(Long projectId);
}
