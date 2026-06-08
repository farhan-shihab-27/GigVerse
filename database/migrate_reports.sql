-- GigVerse — Reports Table Migration
-- Stores both auto-generated reports (from mandatory feedback on order completion)
-- and manual user-submitted reports for admin review.

CREATE TABLE IF NOT EXISTS Reports (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id       INT NOT NULL,
    reported_user_id  INT NOT NULL,
    order_id          INT NOT NULL,
    reason            TEXT NOT NULL,
    is_auto_generated TINYINT(1) DEFAULT 0,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES Users(UserID),
    FOREIGN KEY (reported_user_id) REFERENCES Users(UserID),
    FOREIGN KEY (order_id) REFERENCES Orders(OrderID)
);
