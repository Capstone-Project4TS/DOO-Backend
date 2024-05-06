import { Schema, model, mongoose } from 'mongoose';

const workflowTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category' // Reference to the Category model
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory' // Reference to the SubCategory model
    },
    stages: [{
        stageTitle: {
            type: String,
            required: true
        },
        hasCondition: {
            type: Boolean,
            default: false
        },
        condition: {
            type: String,
            optional: true
        },
        approverType: {
            type: String,
            enum: ['Single Person', 'Board'],
            required: true
        },
        board_permissions: {
            permission: String,
            roles: [String],
            min_approvals: Number // Only for approval permission
        }, // Conditional, if reviewer_type is "board"
        single_permissions: {
            role: String,
            permission: String
        },// Conditional, if reviewer_type is "single"
        // Additional properties for variant condition values (if applicable)
        conditionVariants: [{  // Optional array for multiple condition values
            condition_name: String,
            operator: String,
            value: Number,
            approverType: {
                type: String,
                enum: ['Single Person', 'Board'],
                required: true
            },
            board_permissions: {
                permission: String,
                roles: [String],
                min_approvals: Number // Only for approval permission
            }, // Conditional, if reviewer_type is "board"
            single_permissions: {
                role: String,
                permission: String
            }, // Conditional, if reviewer_type is "single"
            
        }]
    }],

    requiredDocumentTemplates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentTemplate' // Reference to the DocumentTemplate model
    }]
});

const WorkflowTemplate = model('WorkflowTemplate', workflowTemplateSchema);

export default WorkflowTemplate;
