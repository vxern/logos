terraform {
  required_providers {
    fauna = {
      source  = "linguition/fauna"
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

resource "fauna_collection" "article_changes" {
  name = "ArticleChanges"
}

resource "fauna_collection" "articles" {
  name = "Articles"
}

resource "fauna_collection" "entry_requests" {
  name = "EntryRequests"
}

resource "fauna_collection" "praises" {
  name = "Praises"
}

resource "fauna_collection" "users" {
  name = "Users"
}

resource "fauna_collection" "warnings" {
  name = "Warnings"
}

resource "fauna_index" "get_article_changes_by_author" {
  depends_on = [fauna_collection.article_changes]

  name   = "GetArticleChangesByAuthor"
  source = "ArticleChanges"
  terms { field = ["data", "author"] }
}

resource "fauna_index" "get_article_changes_by_article" {
  depends_on = [fauna_collection.article_changes, fauna_index.get_article_changes_by_author]

  name   = "GetArticleChangesByArticle"
  source = "ArticleChanges"
  terms { field = ["data", "article"] }
}

resource "fauna_index" "get_articles_by_author" {
  depends_on = [fauna_collection.articles]

  name   = "GetArticlesByAuthor"
  source = "Articles"
  terms { field = ["data", "author"] }
}

resource "fauna_index" "get_articles_by_language" {
  depends_on = [fauna_collection.articles, fauna_index.get_articles_by_author]

  name   = "GetArticlesByLanguage"
  source = "Articles"
  terms { field = ["data", "language"] }
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

resource "fauna_function" "update_article" {
  name = "UpdateArticle"
  body = <<EOF
Query(
  Lambda(
    "arguments",
    Let(
      { article: Select("data", Get(Select("reference", Var("arguments")))) },
      Let(
        {
          previousChanges: If(
            Not(ContainsField("changes", Var("article"))),
            [],
            Select("changes", Var("article"))
          ),
          change: Create(Collection("ArticleChanges"), {
            data: Select("change", Var("arguments"))
          })
        },
        Update(Select("reference", Var("arguments")), {
          data: {
            changes: Append(Var("previousChanges"), [
              Select("ref", Var("change"))
            ])
          }
        })
      )
    )
  )
)
EOF
}