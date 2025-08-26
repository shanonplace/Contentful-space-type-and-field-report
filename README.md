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
node contentful-content-types-script.js
```

### Options

- `--output <file>`: Specify output filename (optional)
- `--help, -h`: Show help message

### Example

```sh
node contentful-content-types-script.js --output=all-types.md
```

## Output

The report will be saved in the directory specified by `OUTPUT_DIR` (default: `reports`).

## Generate a PDF Version

To create a PDF from the Markdown report, use Pandoc:

```sh
pandoc reports/all-types.md -o reports/all-types.pdf --pdf-engine=xelatex -V geometry:margin=1in -V mainfont="Arial"
```

This will generate `all-types.pdf` in the `reports` directory.

## Install Pandoc

Pandoc is required to generate PDF reports. See the official installation guide for Mac, Windows, and Linux:

- [Pandoc Installation Instructions](https://pandoc.org/installing.html)

## Environment Variables

- `CONTENTFUL_SPACE_ID`: Your Contentful space ID (required)
- `CONTENTFUL_MANAGEMENT_TOKEN`: Your Contentful management API token (required)
- `CONTENTFUL_ENVIRONMENT_ID`: Environment ID (default: `master`)
- `OUTPUT_DIR`: Output directory (default: `reports`)

## License

ISC
