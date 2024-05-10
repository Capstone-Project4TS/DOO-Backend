import { Schema, model } from 'mongoose';

const documentTemplateSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  title: {
    type: String,
    required: true,
    unique: true // Ensure unique names
  },
  subCategoryId: {
    type: Schema.Types.ObjectId,
    ref: 'SubCategory',
    // optional: true (if applicable)
  },
  sections: [{
    title: {
      type: String,
      required: true
    },
    content:[
      {
        title: {
          type: String,
          required: true
        },
        type: {
        type: String,
        enum: ['text', 'number', 'date', 'boolean','upload','select'],
        required: true
      },
 
      options: [String], 
      
      // Additional fields for complex sections (optional)
      isRequired: {
        type: Boolean,
        default: false
      },
      conditionalLogic: { // Define logic for displaying sections based on conditions
        type: Boolean,
        optional: true
  
      }}
    ]
    
  }],
  conditionLogic: {  // New field for overall template condition logic
    type: Boolean,
    optional: true
  },
  eligibleConditions: [{  // Simplified array for eligible conditions
    fieldName: String,  // Use a more descriptive name
    dataType: String  // Renamed for clarity
  }],
});
const DocumentTemplate = model('DocumentTemplate', documentTemplateSchema);

export default DocumentTemplate;
