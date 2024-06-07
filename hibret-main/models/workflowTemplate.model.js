import { model, mongoose } from "mongoose";


const workflowTemplateSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // version: {
  //   type: Number,
  //   // required: true,
  //   default: 1,
  // },
  isDeprecated: {
    type: Boolean,
    default: false,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category", // Reference to the Category model
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCategory", // Reference to the SubCategory model
  },
  depId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
  },
  stages: [
    {
      stageTitle: {
        type: String,
        required: true,
      },
      hasCondition: {
        type: Boolean,
        default: false,
      },
      condition: {
        type: String,
        optional: true,
      },
      approverType: {
        type: String,
        enum: ["Single Person", "Committee"],
        // required: true
      },
      committee_permissions: {
        permission: {
          type: String,
          enum: ["approver", "reviewer"], // Define enum values
        },
        role_ids: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Committee",
        },
        min_approvals: Number, // Only for approval permission
      }, // Conditional, if reviewer_type is "Committee"
      single_permissions: {
        role_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Role",
        },
        permission: {
          type: String,
          enum: ["approver", "reviewer"], // Define enum values
          // required: true
        },
      }, // Conditional, if reviewer_type is "single"
      // Additional properties for variant condition values (if applicable)
      conditionVariants: [
        {
          // Optional array for multiple condition values
          condition_name: String,
          operator: String,
          value: Number,
          approverType: {
            type: String,
            enum: ["Single Person", "Committee"],
            required: true,
          },
          committee_permissions: {
            permission: {
              type: String,
              enum: ["approver", "reviewer"], // Define enum values
              // required: true
            },
            role_ids: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Committee",
            },
            min_approvals: Number, // Only for approval permission
          }, // Conditional, if reviewer_type is "Committee"
          single_permissions: {
            role_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Role",
            },
            permission: {
              type: String,
              enum: ["approver", "reviewer"], // Define enum values
              // required: true
            },
          }, // Conditional, if reviewer_type is "single"
        },
      ],
    },
  ],

  additionalDoc: {
    type: Boolean,
    default: false,
  },
  requiredDocumentTemplates: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentTemplate", // Reference to the DocumentTemplate model
      required: true,
    },
  ],
  additionalDocumentTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DocumentTemplate", // Reference to the DocumentTemplate model
  },
},{
  timestamps: true,
});


const WorkflowTemplate = model("WorkflowTemplate", workflowTemplateSchema);

export default WorkflowTemplate;
