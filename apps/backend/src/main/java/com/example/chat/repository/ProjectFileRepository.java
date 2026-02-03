package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.example.chat.model.*;

public interface ProjectFileRepository extends JpaRepository<ProjectFile, Long> {
  List<ProjectFile> findByProjectId(Long projectId);
}
