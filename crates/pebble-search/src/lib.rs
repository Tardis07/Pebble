pub mod schema;

use std::path::Path;
use std::sync::Mutex;

use pebble_core::{Message, PebbleError, Result};
use pebble_core::traits::SearchHit;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::Value;
use tantivy::{DateTime, Index, IndexWriter, ReloadPolicy, TantivyDocument};

use schema::build_schema;

pub struct TantivySearch {
    index: Index,
    writer: Mutex<IndexWriter>,
}

impl TantivySearch {
    pub fn open(index_path: &Path) -> Result<Self> {
        let ss = build_schema();
        let index = if index_path.exists() {
            Index::open_in_dir(index_path)
                .map_err(|e| PebbleError::Storage(format!("Failed to open index: {e}")))?
        } else {
            std::fs::create_dir_all(index_path)
                .map_err(|e| PebbleError::Storage(format!("Failed to create index dir: {e}")))?;
            Index::create_in_dir(index_path, ss.schema)
                .map_err(|e| PebbleError::Storage(format!("Failed to create index: {e}")))?
        };

        let writer = index
            .writer(50_000_000)
            .map_err(|e| PebbleError::Internal(format!("Failed to create writer: {e}")))?;

        Ok(Self {
            index,
            writer: Mutex::new(writer),
        })
    }

    pub fn open_in_memory() -> Result<Self> {
        let ss = build_schema();
        let index = Index::create_in_ram(ss.schema);

        let writer = index
            .writer(15_000_000)
            .map_err(|e| PebbleError::Internal(format!("Failed to create writer: {e}")))?;

        Ok(Self {
            index,
            writer: Mutex::new(writer),
        })
    }

    pub fn index_message(&self, msg: &Message, folder_ids: &[String]) -> Result<()> {
        let ss = build_schema();
        let mut doc = TantivyDocument::default();

        doc.add_text(ss.message_id, &msg.id);
        doc.add_text(ss.subject, &msg.subject);
        doc.add_text(ss.body_text, &msg.body_text);
        doc.add_text(ss.from_address, &msg.from_address);
        doc.add_text(ss.from_name, &msg.from_name);

        let to_text: Vec<String> = msg
            .to_list
            .iter()
            .map(|ea| {
                if let Some(name) = &ea.name {
                    format!("{} {}", name, ea.address)
                } else {
                    ea.address.clone()
                }
            })
            .collect();
        doc.add_text(ss.to_addresses, to_text.join(" "));

        doc.add_date(ss.date, DateTime::from_timestamp_secs(msg.date));

        for fid in folder_ids {
            doc.add_text(ss.folder_id, fid);
        }
        doc.add_text(ss.account_id, &msg.account_id);
        doc.add_text(
            ss.has_attachment,
            if msg.has_attachments { "true" } else { "false" },
        );

        let writer = self
            .writer
            .lock()
            .map_err(|e| PebbleError::Internal(format!("Lock poisoned: {e}")))?;

        writer
            .add_document(doc)
            .map_err(|e| PebbleError::Internal(format!("Failed to add document: {e}")))?;

        Ok(())
    }

    pub fn commit(&self) -> Result<()> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|e| PebbleError::Internal(format!("Lock poisoned: {e}")))?;

        writer
            .commit()
            .map_err(|e| PebbleError::Internal(format!("Failed to commit: {e}")))?;

        Ok(())
    }

    pub fn search(&self, query_text: &str, limit: usize) -> Result<Vec<SearchHit>> {
        let ss = build_schema();

        let reader = self
            .index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()
            .map_err(|e| PebbleError::Internal(format!("Failed to create reader: {e}")))?;

        let searcher = reader.searcher();

        let query_parser = QueryParser::for_index(
            &self.index,
            vec![ss.subject, ss.body_text, ss.from_address, ss.from_name],
        );

        let query = query_parser
            .parse_query(query_text)
            .map_err(|e| PebbleError::Internal(format!("Failed to parse query: {e}")))?;

        let top_docs = searcher
            .search(&query, &TopDocs::with_limit(limit))
            .map_err(|e| PebbleError::Internal(format!("Search failed: {e}")))?;

        let mut hits = Vec::with_capacity(top_docs.len());
        for (score, doc_addr) in top_docs {
            let doc: TantivyDocument = searcher
                .doc(doc_addr)
                .map_err(|e| PebbleError::Internal(format!("Failed to retrieve doc: {e}")))?;

            let message_id = doc
                .get_first(ss.message_id)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let snippet = doc
                .get_first(ss.subject)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            hits.push(SearchHit {
                message_id,
                score,
                snippet,
            });
        }

        Ok(hits)
    }

    pub fn clear_index(&self) -> Result<()> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|e| PebbleError::Internal(format!("Lock poisoned: {e}")))?;

        writer
            .delete_all_documents()
            .map_err(|e| PebbleError::Internal(format!("Failed to delete documents: {e}")))?;

        writer
            .commit()
            .map_err(|e| PebbleError::Internal(format!("Failed to commit after clear: {e}")))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pebble_core::EmailAddress;

    fn make_test_message(id: &str, subject: &str, body: &str, from: &str) -> Message {
        Message {
            id: id.to_string(),
            account_id: "account-1".to_string(),
            remote_id: id.to_string(),
            message_id_header: None,
            in_reply_to: None,
            references_header: None,
            thread_id: None,
            subject: subject.to_string(),
            snippet: subject.to_string(),
            from_address: from.to_string(),
            from_name: "Test Sender".to_string(),
            to_list: vec![EmailAddress {
                name: Some("Recipient".to_string()),
                address: "recipient@example.com".to_string(),
            }],
            cc_list: vec![],
            bcc_list: vec![],
            body_text: body.to_string(),
            body_html_raw: String::new(),
            has_attachments: false,
            is_read: false,
            is_starred: false,
            is_draft: false,
            date: 1_700_000_000,
            remote_version: None,
            is_deleted: false,
            deleted_at: None,
            created_at: 1_700_000_000,
            updated_at: 1_700_000_000,
        }
    }

    #[test]
    fn test_index_and_search_by_subject() {
        let engine = TantivySearch::open_in_memory().unwrap();
        let msg = make_test_message(
            "msg-1",
            "Invoice from Acme Corp",
            "Please find attached invoice.",
            "billing@acme.com",
        );
        engine.index_message(&msg, &["inbox".to_string()]).unwrap();
        engine.commit().unwrap();

        let hits = engine.search("Invoice", 10).unwrap();
        assert!(!hits.is_empty(), "expected at least one hit");
        assert_eq!(hits[0].message_id, "msg-1");
    }

    #[test]
    fn test_search_by_body() {
        let engine = TantivySearch::open_in_memory().unwrap();
        let msg = make_test_message(
            "msg-2",
            "Meeting notes",
            "quarterly budget review discussion",
            "boss@company.com",
        );
        engine.index_message(&msg, &["inbox".to_string()]).unwrap();
        engine.commit().unwrap();

        let hits = engine.search("quarterly budget", 10).unwrap();
        assert!(!hits.is_empty(), "expected body search to find the message");
        assert_eq!(hits[0].message_id, "msg-2");
    }

    #[test]
    fn test_search_by_from() {
        let engine = TantivySearch::open_in_memory().unwrap();
        let msg = make_test_message(
            "msg-3",
            "Hello there",
            "Just checking in.",
            "alice@wonderland.org",
        );
        engine.index_message(&msg, &["inbox".to_string()]).unwrap();
        engine.commit().unwrap();

        let hits = engine.search("wonderland", 10).unwrap();
        assert!(!hits.is_empty(), "expected from_address search to find the message");
        assert_eq!(hits[0].message_id, "msg-3");
    }

    #[test]
    fn test_search_no_results() {
        let engine = TantivySearch::open_in_memory().unwrap();
        let msg = make_test_message(
            "msg-4",
            "Ordinary message",
            "Nothing special here.",
            "user@example.com",
        );
        engine.index_message(&msg, &["inbox".to_string()]).unwrap();
        engine.commit().unwrap();

        let hits = engine.search("xyzzy_nonexistent_term_42", 10).unwrap();
        assert!(hits.is_empty(), "expected no results for nonexistent term");
    }

    #[test]
    fn test_clear_index() {
        let engine = TantivySearch::open_in_memory().unwrap();
        let msg = make_test_message(
            "msg-5",
            "Clearable message",
            "This will be deleted.",
            "temp@example.com",
        );
        engine.index_message(&msg, &["inbox".to_string()]).unwrap();
        engine.commit().unwrap();

        // Verify indexed
        let hits_before = engine.search("Clearable", 10).unwrap();
        assert!(!hits_before.is_empty(), "expected message before clear");

        engine.clear_index().unwrap();

        let hits_after = engine.search("Clearable", 10).unwrap();
        assert!(hits_after.is_empty(), "expected no results after clear");
    }
}
