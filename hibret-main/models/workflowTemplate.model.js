import {  model, mongoose , Schema, Types} from 'mongoose';

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
                enum: ['approve', 'review'], // Define enum values

            },
            role_ids: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            }],
            min_approvals: Number // Only for approval permission
        }, // Conditional, if reviewer_type is "Committee"
        single_permissions: {
            role_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            },
            permission: {
                type: String,
                enum: ['approve', 'review'], // Define enum values
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
                    enum: ['approve', 'review'], // Define enum values
                    // required: true
                },
                role_ids: [{
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Committee'
                }],
                min_approvals: Number // Only for approval permission
            }, // Conditional, if reviewer_type is "Committee"
            single_permissions: {
                role_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Role'
                },
                permission: {
                    type: String,
                    enum: ['approve', 'review'], // Define enum values
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

// Middleware to track changes and create historical records
workflowTemplateSchema.post('save', async function(next) {
    try {
        // Check if the document is new or an existing one
        if (this.isNew) {
            // If it's a new document, set the version to 1
            this.version = 1;
            console.log( this.version)
        } else {
            // If it's an existing document, increment the version
            this.version = (this.version || 0) + 1;
            // console.log( this.version)
        }
     
        


        await WorkflowTemplateHistory.create({
            workflowTemplateId: this._id,
            version: this.version,
            data: this.toObject()
        });
       
    } catch (error) {
        next(error);
    }
});

const WorkflowTemplate = model('WorkflowTemplate', workflowTemplateSchema);

export default WorkflowTemplate;
