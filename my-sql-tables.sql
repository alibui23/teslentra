-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: inventory_system
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_log`
--

DROP TABLE IF EXISTS `activity_log`;
CREATE TABLE `activity_log` (
  `activity_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_type` varchar(80) NOT NULL,
  `entity_type` varchar(40) NOT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`),
  KEY `idx_activity_log_occurred_at` (`occurred_at`),
  KEY `idx_activity_log_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `asset_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `equipment_number` varchar(100) NOT NULL,
  `asset_type` varchar(100) DEFAULT NULL,
  `part_id` bigint unsigned NOT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `barcode` varchar(255) DEFAULT NULL,
  `parent_asset_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`asset_id`),
  UNIQUE KEY `uq_assets_asset_tag` (`equipment_number`),
  UNIQUE KEY `uq_assets_serial_number` (`serial_number`),
  UNIQUE KEY `uq_assets_barcode` (`barcode`),
  KEY `idx_assets_part_id` (`part_id`),
  KEY `idx_assets_parent_asset_id` (`parent_asset_id`),
  KEY `idx_assets_status` (`status`),
  CONSTRAINT `fk_assets_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `checkouts`
--

DROP TABLE IF EXISTS `checkouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkouts` (
  `checkout_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `to_name` varchar(255) DEFAULT NULL,
  `out_at` datetime DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `returned_location` varchar(255) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`checkout_id`),
  KEY `idx_checkouts_asset_id` (`asset_id`),
  KEY `idx_checkouts_due_at` (`due_at`),
  CONSTRAINT `fk_checkouts_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `comment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `comment_text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`comment_id`),
  KEY `idx_comments_asset_id` (`asset_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `context_tag`
--

DROP TABLE IF EXISTS `context_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `context_tag` (
  `context_tag_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `context_tag_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`context_tag_id`),
  KEY `idx_context_tag_asset_id` (`asset_id`),
  KEY `idx_context_tag_name` (`context_tag_name`),
  CONSTRAINT `fk_context_tag_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_fields`
--

DROP TABLE IF EXISTS `custom_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_fields` (
  `custom_fields_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `field1` text,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`custom_fields_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `location_id` int NOT NULL AUTO_INCREMENT,
  `parent_location_id` int DEFAULT NULL,
  `location_name` varchar(100) NOT NULL,
  `location_path` varchar(500) NOT NULL,
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `uq_location_path` (`location_path`),
  UNIQUE KEY `uq_location_parent_name` (`parent_location_id`,`location_name`),
  CONSTRAINT `fk_locations_parent` FOREIGN KEY (`parent_location_id`) REFERENCES `locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parts`
--

DROP TABLE IF EXISTS `parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parts` (
  `part_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) NOT NULL,
  `part_name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `image_urls` json DEFAULT NULL,
  `image_url` text,
  `image_description` varchar(255) DEFAULT NULL,
  `tracking` varchar(50) DEFAULT NULL,
  `manufacturer` varchar(255) DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `supplier_number` varchar(255) DEFAULT NULL,
  `sharepoint_description` varchar(255) DEFAULT NULL,
  `sharepoint_urls` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`part_id`),
  UNIQUE KEY `uq_parts_part_num` (`part_number`),
  KEY `idx_parts_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `purchases_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned DEFAULT NULL,
  `vendor` varchar(255) DEFAULT NULL,
  `po_number` varchar(100) DEFAULT NULL,
  `quantity` int unsigned DEFAULT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `ordered_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`purchases_id`),
  KEY `idx_purchases_po_number` (`po_number`),
  KEY `fk_purchases_asset` (`asset_id`),
  CONSTRAINT `fk_purchases_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_assets`
--

DROP TABLE IF EXISTS `sub_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_assets` (
  `sub_asset_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_asset_id` bigint unsigned NOT NULL,
  `child_asset_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`sub_asset_id`),
  UNIQUE KEY `uq_sub_assets_parent_child` (`parent_asset_id`,`child_asset_id`),
  KEY `fk_sub_assets_child` (`child_asset_id`),
  CONSTRAINT `fk_sub_assets_child` FOREIGN KEY (`child_asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sub_assets_parent` FOREIGN KEY (`parent_asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_parts`
--

DROP TABLE IF EXISTS `sub_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_parts` (
  `sub_part_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_part_id` bigint unsigned NOT NULL,
  `child_part_id` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`sub_part_id`),
  UNIQUE KEY `uq_sub_parts_parent_child` (`parent_part_id`,`child_part_id`),
  KEY `idx_sub_parts_child_part_id` (`child_part_id`),
  CONSTRAINT `fk_sub_parts_child` FOREIGN KEY (`child_part_id`) REFERENCES `parts` (`part_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sub_parts_parent` FOREIGN KEY (`parent_part_id`) REFERENCES `parts` (`part_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `chk_sub_parts_no_self` CHECK ((`parent_part_id` <> `child_part_id`)),
  CONSTRAINT `chk_sub_parts_quantity` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-21  8:58:44
