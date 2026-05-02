-- ============================================================
-- GigVerse — Database Schema  (MySQL 8.x)
-- Strict 3NF / BCNF — 16 Tables
-- Runs against the connected database (Aiven defaultdb).
-- ============================================================

-- ── Lookup / Dimension Tables ───────────────────────────────

CREATE TABLE IF NOT EXISTS Roles (
  RoleID   INT          AUTO_INCREMENT PRIMARY KEY,
  RoleName VARCHAR(50)  NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Departments (
  DeptID   INT          AUTO_INCREMENT PRIMARY KEY,
  DeptName VARCHAR(100) NOT NULL,
  DeptCode VARCHAR(20)  NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Categories (
  CategoryID   INT          AUTO_INCREMENT PRIMARY KEY,
  CategoryName VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Skills (
  SkillID    INT          AUTO_INCREMENT PRIMARY KEY,
  CategoryID INT          NOT NULL,
  SkillName  VARCHAR(100) NOT NULL,
  CONSTRAINT fk_skills_category
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── Core User Table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS Users (
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

CREATE TABLE IF NOT EXISTS User_Private_Info (
  UserID             INT          PRIMARY KEY,
  WhatsAppNumber     VARCHAR(20)  NULL,
  BkashNumber        VARCHAR(20)  NULL,
  BankAccountDetails TEXT         NULL,
  CONSTRAINT fk_private_user
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── User ↔ Skills  (M‑to‑M junction) ───────────────────────

CREATE TABLE IF NOT EXISTS User_Skills (
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

CREATE TABLE IF NOT EXISTS Gigs (
  GigID         INT            AUTO_INCREMENT PRIMARY KEY,
  ContributorID INT            NOT NULL,
  Title         VARCHAR(200)   NOT NULL,
  Description   TEXT           NULL,
  BasePrice     DECIMAL(10,2)  NOT NULL,
  CreatedAt     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gigs_contributor
    FOREIGN KEY (ContributorID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Gig_Images  (Multi-image gallery per gig) ──────────────

CREATE TABLE IF NOT EXISTS Gig_Images (
  ImageID   INT          AUTO_INCREMENT PRIMARY KEY,
  GigID     INT          NOT NULL,
  ImageUrl  VARCHAR(500) NOT NULL,
  IsPrimary BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_gig_images_gig
    FOREIGN KEY (GigID) REFERENCES Gigs(GigID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Orders  (Micro‑Escrow) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS Orders (
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

-- ── Payments  (Transaction ledger) ─────────────────────────

CREATE TABLE IF NOT EXISTS Payments (
  PaymentID     INT            AUTO_INCREMENT PRIMARY KEY,
  OrderID       INT            NOT NULL,
  TransactionID VARCHAR(100)   NOT NULL UNIQUE,
  Amount        DECIMAL(10,2)  NOT NULL,
  PaymentMethod VARCHAR(50)    NOT NULL DEFAULT 'Bkash',
  Status        VARCHAR(30)    NOT NULL DEFAULT 'Pending'
                CHECK (Status IN ('Pending','Completed','Failed','Refunded')),
  CreatedAt     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Reviews  (1 review per order) ───────────────────────────

CREATE TABLE IF NOT EXISTS Reviews (
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

-- ── Messages  (Real-time chat history) ─────────────────────

CREATE TABLE IF NOT EXISTS Messages (
  MessageID  INT       AUTO_INCREMENT PRIMARY KEY,
  SenderID   INT       NOT NULL,
  ReceiverID INT       NOT NULL,
  Content    TEXT      NOT NULL,
  IsRead     BOOLEAN   NOT NULL DEFAULT FALSE,
  Timestamp  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (SenderID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (ReceiverID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Notifications  (System alerts) ─────────────────────────

CREATE TABLE IF NOT EXISTS Notifications (
  NotificationID INT          AUTO_INCREMENT PRIMARY KEY,
  UserID         INT          NOT NULL,
  Title          VARCHAR(200) NOT NULL,
  Content        TEXT         NOT NULL,
  IsRead         BOOLEAN      NOT NULL DEFAULT FALSE,
  CreatedAt      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Disputes  (Conflict resolution for escrow) ─────────────

CREATE TABLE IF NOT EXISTS Disputes (
  DisputeID         INT          AUTO_INCREMENT PRIMARY KEY,
  OrderID           INT          NOT NULL,
  RaisedByUserID    INT          NOT NULL,
  Reason            TEXT         NOT NULL,
  Status            VARCHAR(30)  NOT NULL DEFAULT 'Open'
                    CHECK (Status IN ('Open','Under_Review','Resolved','Dismissed')),
  ResolutionDetails TEXT         NULL,
  CreatedAt         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_disputes_order
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_disputes_user
    FOREIGN KEY (RaisedByUserID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Bookmarks  (Users save favourite gigs) ─────────────────

CREATE TABLE IF NOT EXISTS Bookmarks (
  BookmarkID INT       AUTO_INCREMENT PRIMARY KEY,
  UserID     INT       NOT NULL,
  GigID      INT       NOT NULL,
  CreatedAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookmark (UserID, GigID),
  CONSTRAINT fk_bookmarks_user
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_gig
    FOREIGN KEY (GigID) REFERENCES Gigs(GigID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════
-- Performance Indexes
-- ════════════════════════════════════════════════════════════

CREATE INDEX idx_users_role          ON Users (RoleID);
CREATE INDEX idx_users_dept          ON Users (DeptID);
CREATE INDEX idx_users_pvp           ON Users (PVP_Points DESC);
CREATE INDEX idx_skills_category     ON Skills (CategoryID);
CREATE INDEX idx_gigs_contributor    ON Gigs (ContributorID);
CREATE INDEX idx_gigs_price          ON Gigs (BasePrice);
CREATE INDEX idx_gig_images_gig      ON Gig_Images (GigID);
CREATE INDEX idx_orders_client       ON Orders (ClientID);
CREATE INDEX idx_orders_contributor  ON Orders (ContributorID);
CREATE INDEX idx_orders_gig          ON Orders (GigID);
CREATE INDEX idx_orders_status       ON Orders (OrderStatus);
CREATE INDEX idx_payments_order      ON Payments (OrderID);
CREATE INDEX idx_payments_status     ON Payments (Status);
CREATE INDEX idx_payments_txn        ON Payments (TransactionID);
CREATE INDEX idx_reviews_order       ON Reviews (OrderID);
CREATE INDEX idx_reviews_reviewer    ON Reviews (ReviewerID);
CREATE INDEX idx_messages_sender     ON Messages (SenderID);
CREATE INDEX idx_messages_receiver   ON Messages (ReceiverID);
CREATE INDEX idx_messages_read       ON Messages (IsRead);
CREATE INDEX idx_notifications_user  ON Notifications (UserID);
CREATE INDEX idx_notifications_read  ON Notifications (IsRead);
CREATE INDEX idx_disputes_order      ON Disputes (OrderID);
CREATE INDEX idx_disputes_status     ON Disputes (Status);
CREATE INDEX idx_bookmarks_user      ON Bookmarks (UserID);
CREATE INDEX idx_bookmarks_gig       ON Bookmarks (GigID);

-- ════════════════════════════════════════════════════════════
-- Seed Data (Roles, Departments, Categories & Skills)
-- ════════════════════════════════════════════════════════════

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
