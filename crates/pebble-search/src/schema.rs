use tantivy::schema::{
    DateOptions, Field, IndexRecordOption, Schema, SchemaBuilder, TextFieldIndexing, TextOptions,
    INDEXED, STORED, STRING,
};
use tantivy::DateTimePrecision;

pub struct SearchSchema {
    pub schema: Schema,
    pub message_id: Field,
    pub subject: Field,
    pub body_text: Field,
    pub from_address: Field,
    pub from_name: Field,
    pub to_addresses: Field,
    pub date: Field,
    pub folder_id: Field,
    pub account_id: Field,
    pub has_attachment: Field,
}

pub fn build_schema() -> SearchSchema {
    let mut builder: SchemaBuilder = Schema::builder();

    let message_id = builder.add_text_field("message_id", STRING | STORED);

    let text_stored = TextOptions::default()
        .set_indexing_options(
            TextFieldIndexing::default()
                .set_tokenizer("default")
                .set_index_option(IndexRecordOption::WithFreqsAndPositions),
        )
        .set_stored();

    let text_only = TextOptions::default().set_indexing_options(
        TextFieldIndexing::default()
            .set_tokenizer("default")
            .set_index_option(IndexRecordOption::WithFreqsAndPositions),
    );

    let subject = builder.add_text_field("subject", text_stored.clone());
    let body_text = builder.add_text_field("body_text", text_only.clone());
    let from_address = builder.add_text_field("from_address", text_stored.clone());
    let from_name = builder.add_text_field("from_name", text_stored);
    let to_addresses = builder.add_text_field("to_addresses", text_only);

    let date_options = DateOptions::from(INDEXED | STORED)
        .set_precision(DateTimePrecision::Seconds);
    let date = builder.add_date_field("date", date_options);

    let folder_id = builder.add_text_field("folder_id", STRING);
    let account_id = builder.add_text_field("account_id", STRING);
    let has_attachment = builder.add_text_field("has_attachment", STRING);

    let schema = builder.build();

    SearchSchema {
        schema,
        message_id,
        subject,
        body_text,
        from_address,
        from_name,
        to_addresses,
        date,
        folder_id,
        account_id,
        has_attachment,
    }
}
