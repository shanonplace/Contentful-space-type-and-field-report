# Contentful Content Types and Validations Report Generator

This script generates a comprehensive report of all content types in a Contentful space, including detailed field information and validation rules.

## Setup

1. Clone this repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the project root (see `.env.sample` for required variables):
   ```env
   CONTENTFUL_SPACE_ID=your_space_id_here
   CONTENTFUL_MANAGEMENT_TOKEN=your_management_token_here
   CONTENTFUL_ENVIRONMENT_ID=master
   OUTPUT_DIR=reports
   ```

## Usage

Run the script with Node.js:

```sh
node contentful-content-types-script.js --format=table
```

### Options

- `--format <type>`: Output format (`table`, `json`, `csv`, `markdown`). Default: `table`
- `--output <file>`: Specify output filename (optional)
- `--help, -h`: Show help message

### Example

```sh
node contentful-content-types-script.js --format=json --output=types.json
```

## Output

The report will be saved in the directory specified by `OUTPUT_DIR` (default: `reports`).

## Environment Variables

- `CONTENTFUL_SPACE_ID`: Your Contentful space ID (required)
- `CONTENTFUL_MANAGEMENT_TOKEN`: Your Contentful management API token (required)
- `CONTENTFUL_ENVIRONMENT_ID`: Environment ID (default: `master`)
- `OUTPUT_DIR`: Output directory (default: `reports`)

## License

ISC
