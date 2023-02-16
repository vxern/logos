terraform {
  required_providers {
    fauna = {
      source  = "wordcollector/fauna"
      version = "0.1.1"
    }
  }
}

// Allows the usage of the .env file.
locals {
  env = { for tuple in regexall("(.*)=(.*)\r", file(".env")) : tuple[0] => sensitive(tuple[1]) }
}

provider "fauna" {
  secret   = local.env["FAUNA_SECRET"]
  endpoint = "https://db.us.fauna.com"
}

# Do not delete until data has been migrated.
resource "fauna_collection" "article_changes" {
  name = "ArticleChanges"
}

# Do not delete until data has been migrated.
resource "fauna_collection" "articles" {
  name = "Articles"
}

resource "fauna_collection" "entry_requests" {
  name = "EntryRequests"
}

resource "fauna_collection" "praises" {
  name = "Praises"
}

resource "fauna_collection" "reports" {
  name = "Reports"
}

resource "fauna_collection" "suggestions" {
  name = "Suggestions"
}

resource "fauna_collection" "users" {
  name = "Users"
}

resource "fauna_collection" "warnings" {
  name = "Warnings"
}

resource "fauna_index" "get_praises_by_sender" {
  depends_on = [fauna_collection.praises]

  name   = "GetPraisesBySender"
  source = "Praises"
  terms { field = ["data", "sender"] }
}

resource "fauna_index" "get_praises_by_recipient" {
  depends_on = [fauna_collection.praises, fauna_index.get_praises_by_sender]

  name   = "GetPraisesByRecipient"
  source = "Praises"
  terms { field = ["data", "recipient"] }
}

resource "fauna_index" "get_user_by_id" {
  depends_on = [fauna_collection.users]

  name   = "GetUserByID"
  source = "Users"
  terms { field = ["data", "account", "id"] }
  unique     = true
  serialized = true
}

resource "fauna_index" "get_warnings_by_recipient" {
  depends_on = [fauna_collection.warnings]

  name   = "GetWarningsByRecipient"
  source = "Warnings"
  terms { field = ["data", "recipient"] }
}