-- ============================================================
-- GigVerse — Database Schema  (MySQL 8.x)
-- Strict 3NF / BCNF — derived from the canonical DBML spec.
-- ============================================================

CREATE DATABASE IF NOT EXISTS gigverse
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gigverse;

-- ── Lookup / Dimension Tables ───────────────────────────────

CREATE TABLE Roles (
  RoleID   INT          AUTO_INCREMENT PRIMARY KEY,
  RoleName VARCHAR(50)  NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Departments (
  DeptID   INT          AUTO_INCREMENT PRIMARY KEY,
  DeptName VARCHAR(100) NOT NULL,
  DeptCode VARCHAR(20)  NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Categories (
  CategoryID   INT          AUTO_INCREMENT PRIMARY KEY,
  CategoryName VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Skills (
  SkillID    INT          AUTO_INCREMENT PRIMARY KEY,
  CategoryID INT          NOT NULL,
  SkillName  VARCHAR(100) NOT NULL,
  CONSTRAINT fk_skills_category
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Core User Table ─────────────────────────────────────────

CREATE TABLE Users (
  UserID        INT            AUTO_INCREMENT PRIMARY KEY,
  RoleID        INT            NOT NULL,
  DeptID        INT            NOT NULL,
  Name          VARCHAR(120)   NOT NULL,
  UiuEmail      VARCHAR(150)   NOT NULL UNIQUE,
  PersonalEmail VARCHAR(150)   NOT NULL UNIQUE,
  PasswordHash  VARCHAR(255)   NOT NULL,
  DOB           DATE           NULL,
  ProfilePicUrl VARCHAR(500)   NULL,
  Bio           TEXT           NULL,
  PVP_Points    INT            NOT NULL DEFAULT 0,
  AverageRating DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
  CreatedAt     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_users_dept
    FOREIGN KEY (DeptID) REFERENCES Departments(DeptID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Private / Sensitive User Info  (1‑to‑1) ────────────────

CREATE TABLE User_Private_Info (
  UserID             INT          PRIMARY KEY,
  WhatsAppNumber     VARCHAR(20)  NULL,
  BkashNumber        VARCHAR(20)  NULL,
  BankAccountDetails TEXT         NULL,
  CONSTRAINT fk_private_user
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── User ↔ Skills  (M‑to‑M junction) ───────────────────────

CREATE TABLE User_Skills (
  UserID  INT NOT NULL,
  SkillID INT NOT NULL,
  PRIMARY KEY (UserID, SkillID),
  CONSTRAINT fk_uskills_user
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_uskills_skill
    FOREIGN KEY (SkillID) REFERENCES Skills(SkillID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Gigs ────────────────────────────────────────────────────

CREATE TABLE Gigs (
  GigID         INT            AUTO_INCREMENT PRIMARY KEY,
  ContributorID INT            NOT NULL,
  Title         VARCHAR(200)   NOT NULL,
  Description   TEXT           NULL,
  BasePrice     DECIMAL(10,2)  NOT NULL,
  CONSTRAINT fk_gigs_contributor
    FOREIGN KEY (ContributorID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Orders  (Micro‑Escrow) ─────────────────────────────────

CREATE TABLE Orders (
  OrderID       INT            AUTO_INCREMENT PRIMARY KEY,
  ClientID      INT            NOT NULL,
  ContributorID INT            NOT NULL,
  GigID         INT            NOT NULL,
  Amount        DECIMAL(10,2)  NOT NULL,
  OrderStatus   VARCHAR(50)    NOT NULL DEFAULT 'Pending',
  PaymentStatus VARCHAR(50)    NOT NULL DEFAULT 'Escrow_Held',
  CreatedAt     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_client
    FOREIGN KEY (ClientID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_contributor
    FOREIGN KEY (ContributorID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_gig
    FOREIGN KEY (GigID) REFERENCES Gigs(GigID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Reviews  (1 review per order) ───────────────────────────

CREATE TABLE Reviews (
  ReviewID   INT       AUTO_INCREMENT PRIMARY KEY,
  OrderID    INT       NOT NULL UNIQUE,
  ReviewerID INT       NOT NULL,
  Rating     INT       NOT NULL CHECK (Rating BETWEEN 1 AND 5),
  Comment    TEXT      NULL,
  CreatedAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_order
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reviewer
    FOREIGN KEY (ReviewerID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Seed Data (Roles & Sample Departments) ──────────────────

INSERT INTO Roles (RoleName) VALUES
  ('Student'), ('Alumni'), ('Faculty');

INSERT INTO Departments (DeptName, DeptCode) VALUES
  ('Computer Science and Engineering', 'CSE'),
  ('Electrical and Electronic Engineering', 'EEE'),
  ('Business Administration', 'BBA'),
  ('Economics', 'ECO'),
  ('Civil Engineering', 'CE');

INSERT INTO Categories (CategoryName) VALUES
  ('Design'), ('Development'), ('Writing'), ('Marketing'), ('Tutoring');

INSERT INTO Skills (CategoryID, SkillName) VALUES
  (1, 'Logo Design'),
  (1, 'UI/UX Design'),
  (2, 'Web Development'),
  (2, 'Mobile App Development'),
  (2, 'Python Scripting'),
  (3, 'Content Writing'),
  (3, 'Academic Writing'),
  (4, 'Social Media Marketing'),
  (5, 'Math Tutoring'),
  (5, 'Programming Tutoring');
