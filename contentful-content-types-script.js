#!/usr/bin/env node

/**
 * Contentful Content Types and Validations Report Generator
 *
 * Generates a comprehensive formatted table of all content types in a Contentful space,
 * including detailed field information and validation rules.
 *
 * Usage:
 *   node contentful-content-types-report.js
 *   node contentful-content-types-report.js --dry-run=false
 *   node contentful-content-types-report.js --format=json
 */

import "dotenv/config";
import contentfulManagement from "contentful-management";
const { createClient } = contentfulManagement;
import fs from "fs/promises";
import path from "path";
import minimist from "minimist";

// Parse command line arguments
const args = minimist(process.argv.slice(2), {
  boolean: ["help"],
  string: ["format", "output"],
  default: {
    format: "table",
    output: null,
  },
  alias: {
    h: "help",
    f: "format",
    o: "output",
  },
});

// Configuration from environment variables
const config = {
  spaceId: process.env.CONTENTFUL_SPACE_ID,
  environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID || "master",
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
  outputDir: process.env.OUTPUT_DIR || "reports",
};

// Validation function for required environment variables
function validateConfig() {
  const missingVars = [];

  if (!config.spaceId) missingVars.push("CONTENTFUL_SPACE_ID");
  if (!config.accessToken) missingVars.push("CONTENTFUL_MANAGEMENT_TOKEN");

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error(
      "\n📋 Please check your .env file and ensure all required variables are set."
    );
    process.exit(1);
  }
}

// Help text
function showHelp() {
  console.log(`
Contentful Content Types and Validations Report Generator

Usage:
  node contentful-content-types-report.js [options]

Options:
  --format <type>   Output format: table, json, csv, markdown (default: table)
  --output <file>   Specify output filename (optional)
  --help, -h        Show this help message

Environment Variables (required):
  CONTENTFUL_SPACE_ID          Your Contentful space ID
  CONTENTFUL_MANAGEMENT_TOKEN  Your Contentful management API token
  CONTENTFUL_ENVIRONMENT_ID    Environment ID (default: master)
  OUTPUT_DIR                   Output directory (default: reports)

Examples:
  node contentful-content-types-report.js
  node contentful-content-types-report.js --format=markdown
  node contentful-content-types-report.js --format=json --output=my-content-types.json
`);
}

// Format validation rules into readable text with comprehensive coverage
function formatValidations(validations, field = null) {
  if (!validations || validations.length === 0) return "None";

  return validations
    .map((validation, index) => {
      const rules = [];

      // Basic validations
      if (validation.unique) rules.push("Unique");

      // Size validations (for Symbol, Text, etc.)
      if (validation.size) {
        const size = validation.size;
        if (size.min !== undefined && size.max !== undefined) {
          rules.push(`Length: ${size.min}-${size.max} chars`);
        } else if (size.min !== undefined) {
          rules.push(`Min length: ${size.min} chars`);
        } else if (size.max !== undefined) {
          rules.push(`Max length: ${size.max} chars`);
        }
      }

      // Range validations (for Number, Integer, Date)
      if (validation.range) {
        const range = validation.range;
        if (range.min !== undefined && range.max !== undefined) {
          rules.push(`Range: ${range.min} to ${range.max}`);
        } else if (range.min !== undefined) {
          rules.push(`Min value: ${range.min}`);
        } else if (range.max !== undefined) {
          rules.push(`Max value: ${range.max}`);
        }
      }

      // Predefined values (dropdown/radio options)
      if (
        validation.in &&
        Array.isArray(validation.in) &&
        validation.in.length > 0
      ) {
        const options = validation.in.map((opt) => `"${opt}"`).join(", ");
        rules.push(`Options: [${options}]`);
      }

      // Reference field validations - ENHANCED
      if (validation.linkContentType) {
        if (Array.isArray(validation.linkContentType)) {
          rules.push(`Links to: [${validation.linkContentType.join(", ")}]`);
        } else {
          rules.push(`Links to: ${validation.linkContentType}`);
        }
      }

      // Multiple link content types (for arrays of references)
      if (
        validation.linkContentTypes &&
        Array.isArray(validation.linkContentTypes)
      ) {
        rules.push(`Links to any: [${validation.linkContentTypes.join(", ")}]`);
      }

      // Link mimetype validation (for assets)
      if (
        validation.linkMimetypeGroup &&
        Array.isArray(validation.linkMimetypeGroup)
      ) {
        rules.push(`Asset types: [${validation.linkMimetypeGroup.join(", ")}]`);
      }

      // Asset file size validation
      if (validation.assetFileSize) {
        const size = validation.assetFileSize;
        if (size.min !== undefined && size.max !== undefined) {
          rules.push(`Asset size: ${size.min}-${size.max} bytes`);
        } else if (size.min !== undefined) {
          rules.push(`Asset min size: ${size.min} bytes`);
        } else if (size.max !== undefined) {
          rules.push(`Asset max size: ${size.max} bytes`);
        }
      }

      // Asset image dimensions
      if (validation.assetImageDimensions) {
        const dims = validation.assetImageDimensions;
        const dimRules = [];
        if (dims.width) {
          if (dims.width.min !== undefined && dims.width.max !== undefined) {
            dimRules.push(`width: ${dims.width.min}-${dims.width.max}px`);
          } else if (dims.width.min !== undefined) {
            dimRules.push(`min width: ${dims.width.min}px`);
          } else if (dims.width.max !== undefined) {
            dimRules.push(`max width: ${dims.width.max}px`);
          }
        }
        if (dims.height) {
          if (dims.height.min !== undefined && dims.height.max !== undefined) {
            dimRules.push(`height: ${dims.height.min}-${dims.height.max}px`);
          } else if (dims.height.min !== undefined) {
            dimRules.push(`min height: ${dims.height.min}px`);
          } else if (dims.height.max !== undefined) {
            dimRules.push(`max height: ${dims.height.max}px`);
          }
        }
        if (dimRules.length > 0) {
          rules.push(`Image dimensions: ${dimRules.join(", ")}`);
        }
      }

      // Regex pattern validation
      if (validation.regexp) {
        const pattern = validation.regexp.pattern || validation.regexp;
        const flags = validation.regexp.flags ? `/${flags}` : "";
        rules.push(`Pattern: /${pattern}/${flags}`);
      }

      // Rich text validations - COMPREHENSIVE
      if (validation.enabledNodeTypes) {
        const nodeTypes = Array.isArray(validation.enabledNodeTypes)
          ? validation.enabledNodeTypes
          : [validation.enabledNodeTypes];
        rules.push(`Rich text nodes: [${nodeTypes.join(", ")}]`);
      }

      if (validation.enabledMarks) {
        const marks = Array.isArray(validation.enabledMarks)
          ? validation.enabledMarks
          : [validation.enabledMarks];
        rules.push(`Rich text marks: [${marks.join(", ")}]`);
      }

      // Rich text embedded entries validation
      if (validation.nodes) {
        const nodeRules = [];

        // Embedded entries
        if (validation.nodes["embedded-entry-block"]) {
          const embeddedEntry = validation.nodes["embedded-entry-block"];
          if (embeddedEntry.linkContentType) {
            const types = Array.isArray(embeddedEntry.linkContentType)
              ? embeddedEntry.linkContentType
              : [embeddedEntry.linkContentType];
            nodeRules.push(`Embedded entries: [${types.join(", ")}]`);
          }
        }

        // Embedded assets
        if (validation.nodes["embedded-asset-block"]) {
          nodeRules.push("Embedded assets: allowed");
        }

        // Entry hyperlinks
        if (validation.nodes["entry-hyperlink"]) {
          const entryLink = validation.nodes["entry-hyperlink"];
          if (entryLink.linkContentType) {
            const types = Array.isArray(entryLink.linkContentType)
              ? entryLink.linkContentType
              : [entryLink.linkContentType];
            nodeRules.push(`Entry links: [${types.join(", ")}]`);
          }
        }

        // Asset hyperlinks
        if (validation.nodes["asset-hyperlink"]) {
          nodeRules.push("Asset links: allowed");
        }

        // External hyperlinks
        if (validation.nodes["hyperlink"]) {
          nodeRules.push("External links: allowed");
        }

        if (nodeRules.length > 0) {
          rules.push(`Rich text content: ${nodeRules.join("; ")}`);
        }
      }

      // Date validations
      if (validation.dateRange) {
        const dateRange = validation.dateRange;
        if (dateRange.min && dateRange.max) {
          rules.push(`Date range: ${dateRange.min} to ${dateRange.max}`);
        } else if (dateRange.min) {
          rules.push(`Date after: ${dateRange.min}`);
        } else if (dateRange.max) {
          rules.push(`Date before: ${dateRange.max}`);
        }
      }

      // Prohibited values
      if (validation.prohibitRegexp) {
        const pattern =
          validation.prohibitRegexp.pattern || validation.prohibitRegexp;
        const flags = validation.prohibitRegexp.flags ? `/${flags}` : "";
        rules.push(`Prohibited pattern: /${pattern}/${flags}`);
      }

      // Custom validation message
      if (validation.message) {
        rules.push(`Message: "${validation.message}"`);
      }

      // Array-specific validations
      if (field && field.type === "Array" && field.items) {
        // Array size limits
        if (
          validation.size &&
          (validation.size.min !== undefined ||
            validation.size.max !== undefined)
        ) {
          const size = validation.size;
          if (size.min !== undefined && size.max !== undefined) {
            rules.push(`Array size: ${size.min}-${size.max} items`);
          } else if (size.min !== undefined) {
            rules.push(`Min items: ${size.min}`);
          } else if (size.max !== undefined) {
            rules.push(`Max items: ${size.max}`);
          }
        }
      }

      // If no specific rules were found, check for any other properties
      if (rules.length === 0) {
        const otherKeys = Object.keys(validation).filter(
          (key) => !["message"].includes(key)
        );
        if (otherKeys.length > 0) {
          rules.push(`Other: ${JSON.stringify(validation)}`);
        }
      }

      return rules.length > 0 ? rules.join("; ") : "Unknown validation";
    })
    .join(" | ");
}

// Enhanced function to get field type with better array and reference handling
function getFieldTypeDescription(field) {
  let baseType = field.type;

  if (field.type === "Array" && field.items) {
    const itemType = field.items.type;

    if (itemType === "Link") {
      // Check if it's a reference to entries or assets
      if (field.items.linkType === "Entry") {
        // Get the allowed content types from validations
        const linkValidations = field.items.validations || [];
        const contentTypes = [];

        linkValidations.forEach((validation) => {
          if (validation.linkContentType) {
            if (Array.isArray(validation.linkContentType)) {
              contentTypes.push(...validation.linkContentType);
            } else {
              contentTypes.push(validation.linkContentType);
            }
          }
        });

        if (contentTypes.length > 0) {
          return `Array<Reference to [${contentTypes.join(", ")}]>`;
        } else {
          return "Array<Reference to Entry>";
        }
      } else if (field.items.linkType === "Asset") {
        return "Array<Reference to Asset>";
      } else {
        return `Array<Link to ${field.items.linkType}>`;
      }
    } else {
      return `Array<${itemType}>`;
    }
  } else if (field.type === "Link") {
    if (field.linkType === "Entry") {
      // Get the allowed content types from validations
      const linkValidations = field.validations || [];
      const contentTypes = [];

      linkValidations.forEach((validation) => {
        if (validation.linkContentType) {
          if (Array.isArray(validation.linkContentType)) {
            contentTypes.push(...validation.linkContentType);
          } else {
            contentTypes.push(validation.linkContentType);
          }
        }
      });

      if (contentTypes.length > 0) {
        return `Reference to [${contentTypes.join(", ")}]`;
      } else {
        return "Reference to Entry";
      }
    } else if (field.linkType === "Asset") {
      return "Reference to Asset";
    } else {
      return `Link to ${field.linkType}`;
    }
  }

  return baseType;
}

// Generate table format report
function generateTableReport(contentTypes) {
  const lines = [];

  lines.push("# Contentful Content Types and Validations Report");
  lines.push(`Generated on: ${new Date().toISOString()}`);
  lines.push(`Space ID: ${config.spaceId}`);
  lines.push(`Environment: ${config.environmentId}`);
  lines.push(`Total Content Types: ${contentTypes.length}`);
  lines.push("");

  contentTypes.forEach((contentType, index) => {
    lines.push(`## ${index + 1}. ${contentType.name} (${contentType.sys.id})`);

    if (contentType.description) {
      lines.push(`**Description:** ${contentType.description}`);
    }

    lines.push(`**Display Field:** ${contentType.displayField || "Not set"}`);
    lines.push(`**Fields Count:** ${contentType.fields?.length || 0}`);
    lines.push(
      `**Created:** ${new Date(contentType.sys.createdAt).toLocaleDateString()}`
    );
    lines.push(
      `**Last Updated:** ${new Date(
        contentType.sys.updatedAt
      ).toLocaleDateString()}`
    );
    lines.push("");

    if (contentType.fields && contentType.fields.length > 0) {
      lines.push("### Fields:");
      lines.push(
        "| Field ID | Name | Type | Required | Localized | Status | Validations |"
      );
      lines.push(
        "|----------|------|------|----------|-----------|--------|-------------|"
      );

      contentType.fields.forEach((field) => {
        const validations = formatValidations(field.validations, field);
        const isRequired = field.required ? "✓" : "";
        const isLocalized = field.localized ? "✓" : "";
        const isDisabled = field.disabled ? "🚫" : "";
        const isOmitted = field.omitted ? "👁️" : "";
        const fieldType = getFieldTypeDescription(field);

        // Add default value if present
        let defaultValueStr = "";
        if (field.defaultValue) {
          const defaultVal =
            typeof field.defaultValue === "object"
              ? JSON.stringify(field.defaultValue)
              : field.defaultValue;
          defaultValueStr = ` (default: ${defaultVal})`;
        }

        const statusIcons = [isDisabled, isOmitted].filter(Boolean).join(" ");
        const fieldName = `${field.name}${defaultValueStr}`;

        lines.push(
          `| ${field.id} | ${fieldName} | ${fieldType} | ${isRequired} | ${isLocalized} | ${statusIcons} | ${validations} |`
        );
      });

      lines.push("");
    }

    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

// Generate JSON format report
function generateJsonReport(contentTypes) {
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      spaceId: config.spaceId,
      environmentId: config.environmentId,
      totalContentTypes: contentTypes.length,
    },
    contentTypes: contentTypes.map((contentType) => ({
      id: contentType.sys.id,
      name: contentType.name,
      description: contentType.description,
      displayField: contentType.displayField,
      fieldsCount: contentType.fields?.length || 0,
      createdAt: contentType.sys.createdAt,
      updatedAt: contentType.sys.updatedAt,
      fields:
        contentType.fields?.map((field) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          required: field.required,
          localized: field.localized,
          disabled: field.disabled,
          omitted: field.omitted,
          validations: field.validations,
          defaultValue: field.defaultValue,
          items: field.items,
          linkType: field.linkType,
          fieldTypeDescription: getFieldTypeDescription(field),
        })) || [],
    })),
  };

  return JSON.stringify(report, null, 2);
}

// Generate CSV format report (flattened field data)
function generateCsvReport(contentTypes) {
  const lines = [];

  // Header - enhanced with more columns
  lines.push(
    "ContentType ID,ContentType Name,Field ID,Field Name,Field Type,Field Type Description,Required,Localized,Disabled,Omitted,Default Value,Validations"
  );

  contentTypes.forEach((contentType) => {
    if (!contentType.fields || contentType.fields.length === 0) {
      lines.push(
        `${contentType.sys.id},"${contentType.name}",,,,,"No fields",,,,,"No fields"`
      );
    } else {
      contentType.fields.forEach((field) => {
        const validations = formatValidations(field.validations, field).replace(
          /"/g,
          '""'
        );
        const fieldType = field.type;
        const fieldTypeDescription = getFieldTypeDescription(field);
        const defaultValue = field.defaultValue
          ? typeof field.defaultValue === "object"
            ? JSON.stringify(field.defaultValue).replace(/"/g, '""')
            : String(field.defaultValue).replace(/"/g, '""')
          : "";

        lines.push(
          [
            contentType.sys.id,
            `"${contentType.name}"`,
            field.id,
            `"${field.name}"`,
            fieldType,
            `"${fieldTypeDescription}"`,
            field.required ? "YES" : "NO",
            field.localized ? "YES" : "NO",
            field.disabled ? "YES" : "NO",
            field.omitted ? "YES" : "NO",
            `"${defaultValue}"`,
            `"${validations}"`,
          ].join(",")
        );
      });
    }
  });

  return lines.join("\n");
}

// Generate Markdown format report
function generateMarkdownReport(contentTypes) {
  const lines = [];

  lines.push("# Contentful Content Types Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Space ID:** ${config.spaceId}`);
  lines.push(`**Environment:** ${config.environmentId}`);
  lines.push(`**Total Content Types:** ${contentTypes.length}`);
  lines.push("");
  lines.push("## Table of Contents");
  lines.push("");

  // Generate TOC
  contentTypes.forEach((contentType, index) => {
    lines.push(
      `${index + 1}. [${contentType.name}](#${contentType.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "")})`
    );
  });

  lines.push("");

  // Generate detailed sections
  contentTypes.forEach((contentType) => {
    const anchor = contentType.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    lines.push(`## ${contentType.name} {#${anchor}}`);
    lines.push("");
    lines.push(`- **ID:** \`${contentType.sys.id}\``);
    lines.push(`- **Display Field:** ${contentType.displayField || "Not set"}`);
    lines.push(`- **Fields:** ${contentType.fields?.length || 0}`);
    lines.push(
      `- **Created:** ${new Date(
        contentType.sys.createdAt
      ).toLocaleDateString()}`
    );
    lines.push(
      `- **Updated:** ${new Date(
        contentType.sys.updatedAt
      ).toLocaleDateString()}`
    );

    if (contentType.description) {
      lines.push("");
      lines.push(`> ${contentType.description}`);
    }

    if (contentType.fields && contentType.fields.length > 0) {
      lines.push("");
      lines.push("### Fields");
      lines.push("");

      contentType.fields.forEach((field) => {
        const fieldType = getFieldTypeDescription(field);
        const badges = [];

        if (field.required) badges.push("`Required`");
        if (field.localized) badges.push("`Localized`");
        if (field.disabled) badges.push("`Disabled`");
        if (field.omitted) badges.push("`Omitted`");

        lines.push(`#### ${field.name}`);
        lines.push("");
        lines.push(`- **ID:** \`${field.id}\``);
        lines.push(`- **Type:** ${fieldType}`);
        lines.push(`- **Base Type:** ${field.type}`);

        if (field.linkType) {
          lines.push(`- **Link Type:** ${field.linkType}`);
        }

        if (badges.length > 0) {
          lines.push(`- **Properties:** ${badges.join(" ")}`);
        }

        if (field.defaultValue) {
          const defaultVal =
            typeof field.defaultValue === "object"
              ? JSON.stringify(field.defaultValue, null, 2)
              : field.defaultValue;
          lines.push(`- **Default Value:** \`${defaultVal}\``);
        }

        const validations = formatValidations(field.validations, field);
        if (validations !== "None") {
          lines.push(`- **Validations:** ${validations}`);
        }

        // Add array item details if applicable
        if (field.type === "Array" && field.items) {
          lines.push(`- **Array Item Type:** ${field.items.type}`);
          if (field.items.linkType) {
            lines.push(`- **Array Item Link Type:** ${field.items.linkType}`);
          }
          if (field.items.validations && field.items.validations.length > 0) {
            const itemValidations = formatValidations(
              field.items.validations,
              field
            );
            lines.push(`- **Array Item Validations:** ${itemValidations}`);
          }
        }

        lines.push("");
      });
    }

    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

// Test function to validate that we're capturing all validation types
function validateCompleteness(contentTypes) {
  const validationTypesFound = new Set();
  const fieldTypesFound = new Set();
  const richTextNodeTypes = new Set();
  const richTextMarks = new Set();
  let uncapturedValidations = [];

  contentTypes.forEach((contentType) => {
    contentType.fields?.forEach((field) => {
      fieldTypesFound.add(field.type);

      if (field.validations) {
        field.validations.forEach((validation) => {
          Object.keys(validation).forEach((key) => {
            validationTypesFound.add(key);

            // Check for rich text specific validations
            if (key === "enabledNodeTypes" && Array.isArray(validation[key])) {
              validation[key].forEach((nodeType) =>
                richTextNodeTypes.add(nodeType)
              );
            }
            if (key === "enabledMarks" && Array.isArray(validation[key])) {
              validation[key].forEach((mark) => richTextMarks.add(mark));
            }
            if (key === "nodes" && typeof validation[key] === "object") {
              Object.keys(validation[key]).forEach((nodeType) =>
                richTextNodeTypes.add(nodeType)
              );
            }
          });

          // Check if our formatting function can handle this validation
          try {
            const formatted = formatValidations([validation], field);
            if (
              formatted.includes("Unknown validation") ||
              formatted.includes("Other:")
            ) {
              uncapturedValidations.push({
                contentType: contentType.name,
                field: field.name,
                validation: validation,
              });
            }
          } catch (error) {
            uncapturedValidations.push({
              contentType: contentType.name,
              field: field.name,
              validation: validation,
              error: error.message,
            });
          }
        });
      }

      // Check array item validations
      if (field.type === "Array" && field.items && field.items.validations) {
        field.items.validations.forEach((validation) => {
          Object.keys(validation).forEach((key) => {
            validationTypesFound.add(`items.${key}`);
          });
        });
      }
    });
  });

  return {
    validationTypes: Array.from(validationTypesFound).sort(),
    fieldTypes: Array.from(fieldTypesFound).sort(),
    richTextNodeTypes: Array.from(richTextNodeTypes).sort(),
    richTextMarks: Array.from(richTextMarks).sort(),
    uncapturedValidations,
  };
}
async function ensureOutputDir() {
  try {
    await fs.access(config.outputDir);
  } catch {
    await fs.mkdir(config.outputDir, { recursive: true });
  }
}

// Main function
async function main() {
  if (args.help) {
    showHelp();
    return;
  }

  console.log("🚀 Contentful Content Types Report Generator");
  console.log("============================================");

  validateConfig();

  console.log(`📍 Space: ${config.spaceId}`);
  console.log(`🌍 Environment: ${config.environmentId}`);
  console.log(`📊 Format: ${args.format}`);
  console.log("");

  try {
    // Initialize Contentful client
    console.log("🔑 Initializing Contentful client...");
    const client = createClient({
      accessToken: config.accessToken,
    });

    const space = await client.getSpace(config.spaceId);
    const environment = await space.getEnvironment(config.environmentId);

    // Fetch all content types
    console.log("📥 Fetching content types...");
    const contentTypesResponse = await environment.getContentTypes({
      limit: 1000, // Fetch all content types
    });

    const contentTypes = contentTypesResponse.items;

    console.log(`✅ Found ${contentTypes.length} content types`);

    // Run completeness validation
    const completenessReport = validateCompleteness(contentTypes);

    if (completenessReport.uncapturedValidations.length > 0) {
      console.log(
        `⚠️  Found ${completenessReport.uncapturedValidations.length} potentially uncaptured validations`
      );
      if (args["dry-run"]) {
        console.log("🔍 Uncaptured validations:");
        completenessReport.uncapturedValidations.forEach((item) => {
          console.log(
            `   ${item.contentType}.${item.field}: ${JSON.stringify(
              item.validation
            )}`
          );
        });
      }
    }

    console.log(
      `📋 Validation types found: ${completenessReport.validationTypes.length}`
    );
    console.log(
      `🔧 Field types found: ${completenessReport.fieldTypes.length}`
    );
    if (completenessReport.richTextNodeTypes.length > 0) {
      console.log(
        `📝 Rich text node types: ${completenessReport.richTextNodeTypes.length}`
      );
    }
    if (completenessReport.richTextMarks.length > 0) {
      console.log(
        `🎨 Rich text marks: ${completenessReport.richTextMarks.length}`
      );
    }

    // Generate report based on format
    let reportContent;
    let fileExtension;

    switch (args.format.toLowerCase()) {
      case "json":
        reportContent = generateJsonReport(contentTypes);
        fileExtension = "json";
        break;
      case "csv":
        reportContent = generateCsvReport(contentTypes);
        fileExtension = "csv";
        break;
      case "markdown":
      case "md":
        reportContent = generateMarkdownReport(contentTypes);
        fileExtension = "md";
        break;
      default:
        reportContent = generateTableReport(contentTypes);
        fileExtension = "txt";
    }

    // Determine output filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const defaultFilename = `contentful-content-types-${timestamp}.${fileExtension}`;
    const filename = args.output || defaultFilename;
    const filepath = path.join(config.outputDir, filename);

    await ensureOutputDir();
    await fs.writeFile(filepath, reportContent, "utf8");

    console.log(`✅ Report saved to: ${filepath}`);
    console.log(`📊 File size: ${(reportContent.length / 1024).toFixed(2)} KB`);

    // Summary statistics - enhanced
    console.log("\n📈 Summary:");
    console.log(`   Content Types: ${contentTypes.length}`);

    const totalFields = contentTypes.reduce(
      (sum, ct) => sum + (ct.fields?.length || 0),
      0
    );
    console.log(`   Total Fields: ${totalFields}`);

    const requiredFields = contentTypes.reduce((sum, ct) => {
      return sum + (ct.fields?.filter((f) => f.required).length || 0);
    }, 0);
    console.log(`   Required Fields: ${requiredFields}`);

    const localizedFields = contentTypes.reduce((sum, ct) => {
      return sum + (ct.fields?.filter((f) => f.localized).length || 0);
    }, 0);
    console.log(`   Localized Fields: ${localizedFields}`);

    const referenceFields = contentTypes.reduce((sum, ct) => {
      return (
        sum +
        (ct.fields?.filter(
          (f) =>
            f.type === "Link" ||
            (f.type === "Array" && f.items?.type === "Link")
        ).length || 0)
      );
    }, 0);
    console.log(`   Reference Fields: ${referenceFields}`);

    const richTextFields = contentTypes.reduce((sum, ct) => {
      return (
        sum + (ct.fields?.filter((f) => f.type === "RichText").length || 0)
      );
    }, 0);
    console.log(`   Rich Text Fields: ${richTextFields}`);

    const disabledFields = contentTypes.reduce((sum, ct) => {
      return sum + (ct.fields?.filter((f) => f.disabled).length || 0);
    }, 0);
    console.log(`   Disabled Fields: ${disabledFields}`);

    const fieldsWithValidations = contentTypes.reduce((sum, ct) => {
      return (
        sum +
        (ct.fields?.filter((f) => f.validations && f.validations.length > 0)
          .length || 0)
      );
    }, 0);
    console.log(`   Fields with Validations: ${fieldsWithValidations}`);

    // Field type breakdown
    const fieldTypes = {};
    contentTypes.forEach((ct) => {
      ct.fields?.forEach((field) => {
        const typeDesc = getFieldTypeDescription(field);
        fieldTypes[typeDesc] = (fieldTypes[typeDesc] || 0) + 1;
      });
    });

    console.log("\n📊 Field Type Breakdown:");
    Object.entries(fieldTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Show top 10
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
  } catch (error) {
    console.error("❌ Error generating report:");
    console.error(error.message);

    if (error.response?.data) {
      console.error("API Error Details:", error.response.data);
    }

    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
}
