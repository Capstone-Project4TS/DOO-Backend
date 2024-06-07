import { Schema, model } from "mongoose";

const documentTemplateSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  title: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    // required: true,
    default: 1,
  },
  isDeprecated: {
    type: Boolean,
    default: false,
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  subCategoryId: {
    type: Schema.Types.ObjectId,
    ref: "SubCategory",
  },
  depId: {
    type: Schema.Types.ObjectId,
    ref: "Department",
  },
  sections: [
    {
      title: {
        type: String,
        required: true,
      },
      content: [
        {
          title: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: [
              "text",
              "textarea",
              "number",
              "date",
              "boolean",
              "upload",
              "select",
            ],
            required: true,
          },

          value: {
            type: Schema.Types.Mixed,
            select: false, // Make it invisible during template creation
          },
          // Define options field only for select type
          options: {
            type: [String], // Array of strings
            validate: {
              validator: function () {
                // Validate options field only if type is select
                return this.type === "select"
                  ? Array.isArray(this.options) && this.options.length > 0
                  : true;
              },
              message: "Options are required for select type",
            },
            default: undefined,
          },

          // Additional fields for complex sections (optional)
          isRequired: {
            type: Boolean,
            default: false,
          },

          conditionalLogic: {
            // Define logic for displaying sections based on conditions
            type: Boolean,
            optional: true,
          },
        },
      ],
      multiple: {
        type: Boolean,
        default: false,
      },
    },
  ],
  conditionLogic: {
    // New field for overall template condition logic
    type: Boolean,
    optional: true,
  },
  eligibleConditions: [
    {
      // Simplified array for eligible conditions
      fieldName: String, // Use a more descriptive name
      dataType: String, // Renamed for clarity
    },
  ],
},
{
  timestamps: true,
});

const DocumentTemplate = model("DocumentTemplate", documentTemplateSchema);

export default DocumentTemplate;
