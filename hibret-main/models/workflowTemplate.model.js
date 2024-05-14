import { model, mongoose, Schema, Types } from 'mongoose';
import lodash from 'lodash'

// Schema for storing historical versions of workflow templates
const workflowTemplateHistorySchema = new Schema({
    workflowTemplateId: {
        type: Types.ObjectId,
        ref: 'WorkflowTemplate',
        required: true
    },
    version: {
        type: Number,
        required: true
    },
    data: {
        type: Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const WorkflowTemplateHistory = model('WorkflowTemplateHistory', workflowTemplateHistorySchema);


const workflowTemplateSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
    name: {
        type: String,
        required: true,
        unique: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category' // Reference to the Category model
    },
    subCategoryId: {
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
            enum: ['Single Person', 'Committee'],
            // required: true
        },
        committee_permissions: {
            permission: {
                type: String,
                enum: ['approver', 'reviewer'], // Define enum values

            },
            role_ids: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Committee'
            },
            min_approvals: Number // Only for approval permission
        }, // Conditional, if reviewer_type is "Committee"
        single_permissions: {
            role_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            },
            permission: {
                type: String,
                enum: ['approver', 'reviewer'], // Define enum values
                // required: true
            },
        },// Conditional, if reviewer_type is "single"
        // Additional properties for variant condition values (if applicable)
        conditionVariants: [{  // Optional array for multiple condition values
            condition_name: String,
            operator: String,
            value: Number,
            approverType: {
                type: String,
                enum: ['Single Person', 'Committee'],
                required: true
            },
            committee_permissions: {
                permission: {
                    type: String,
                    enum: ['approver', 'reviewer'], // Define enum values
                    // required: true
                },
                role_ids: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Committee'
                },
                min_approvals: Number // Only for approval permission
            }, // Conditional, if reviewer_type is "Committee"
            single_permissions: {
                role_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Role'
                },
                permission: {
                    type: String,
                    enum: ['approver', 'reviewer'], // Define enum values
                    // required: true
                },
            }, // Conditional, if reviewer_type is "single"

        }]
    }],

    additionalDoc: {  
        type: Boolean,
        default: false,
    },
    requiredDocumentTemplates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentTemplate' // Reference to the DocumentTemplate model
    }]
});


// Middleware to track changes and prevent duplicate versions
import crypto from 'crypto'; // Import the crypto module

workflowTemplateSchema.post('save', async function (next) {
    try {
        // Access the current document being saved
        const currentDocument = this;
        console.log(currentDocument);

        // Extract the fields to be hashed
        const { stages, requiredDocumentTemplates } = currentDocument;

        // Generate a SHA-256 hash for the specified fields in the current document's data
        const hash = crypto.createHash('sha256')
            .update(JSON.stringify({ stages, requiredDocumentTemplates })) // Hash only the specified fields
            .digest('hex');
        console.log(hash);

        // Find all existing versions in WorkflowTemplateHistory for the current document's ID
        const existingVersions = await WorkflowTemplateHistory.find({
            workflowTemplateId: currentDocument._id
        });

        // Update existing versions to hash only the specified fields
        for (const version of existingVersions) {
            version.hash = crypto.createHash('sha256')
                .update(JSON.stringify({ stages: version.data.stages, requiredDocumentTemplates: version.data.requiredDocumentTemplates }))
                .digest('hex');
            await version.save();
        }

        // Find all existing versions' data hashes excluding the current one in WorkflowTemplateHistory
        const existingHashes = await WorkflowTemplateHistory.find({
            workflowTemplateId: currentDocument._id, // Filter by the current document's ID
            hash: { $ne: hash } // Exclude the current document's hash
        }).distinct('hash');
        console.log(existingHashes);

        // Check if the generated hash already exists among the existing versions' hashes
        const isUnique = !existingHashes.includes(hash);
        console.log(isUnique);
        if (!isUnique) {
            const error = new Error('Duplicate workflow template version detected');
            return next(error);
        }

        // Check if the document is new or an existing one
        if (currentDocument.isNew) {
            // If it's a new document, set the version to 1
            currentDocument.version = 1;
        } else {
            // If it's an existing document, increment the version
            currentDocument.version = (currentDocument.version || 0) + 1;
        }

        // Create a new version in the WorkflowTemplateHistory
        const historyRecord = new WorkflowTemplateHistory({
            workflowTemplateId: currentDocument._id,
            version: currentDocument.version,
            data: { stages, requiredDocumentTemplates }, // Save only the specified fields
            createdAt: Date.now()
        });
        await historyRecord.save();

       
    } catch (error) {
        next(error);
    }
});


const WorkflowTemplate = model('WorkflowTemplate', workflowTemplateSchema);

export default WorkflowTemplate;
