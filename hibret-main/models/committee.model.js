import { Schema, model} from 'mongoose';
import mongoose from 'mongoose';

const committeeSchema = new Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
    name: { 
        type: String, 
        required: true 
    }, // Name of the committee
    members: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Role' 
    }], // References to users who are members of the committee
    chairperson: {
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }
});

const Committee = model('Committee', committeeSchema);
export default Committee;
