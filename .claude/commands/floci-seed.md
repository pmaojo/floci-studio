# Floci Studio — Seed

Inject synthetic Faker data into a Floci Studio resource using `seed_mock_data`.

## Arguments

`$ARGUMENTS` format: `<target> <name> [schema_json]`

- `target`: `dynamodb`, `s3`, or `postgres`
- `name`: table name, bucket name, or database name
- `schema_json` (optional): inline JSON object describing the data shape

Examples:
```
/floci-seed dynamodb users
/floci-seed s3 uploads
/floci-seed postgres mydb {"name": "string", "age": "number", "email": "email"}
```

## Steps

1. Parse `$ARGUMENTS` — extract target, name, and optional schema.
2. If target is `dynamodb` or `s3`, first verify the resource exists:
   - `dynamodb` → call `list_dynamodb_tables` and check the name appears
   - `s3` → call `list_s3_buckets` and check the name appears
   - If it doesn't exist, ask the user whether to create it first.
3. Call `seed_mock_data` with the parsed arguments.
4. Report: how many records were inserted, any errors, and a sample of the generated data.

## Notes

- For `postgres`, `connection_string` is required — ask for it if not provided.
- If no schema is given, the backend will auto-generate a generic schema.
