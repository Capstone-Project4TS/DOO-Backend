//import { func } from "joi";
import RoleModel from "../models/role.model.js";
import Committee from "../models/committee.model.js";
import { MongoClient } from "mongodb";

const uri =  "mongodb+srv://root:root@cluster0.nchnoj6.mongodb.net/HR";
const dbName = "HR";
const collectionName = "Role";


export async function updateAllRoles(req, res) {
    try {
        const Roles = await getRoles();
        await updateRoles(Roles);
        await deleteRoles(Roles);
       return {message: 'Roles synchronization completed successfully'}
    } catch (error) {
        console.error('Error fetching roles:', error);
        return { error: 'Internal server error' };
    }
}

export async function getAllRoles(req, res) {
    try {
        const roles = await RoleModel.find({});
        if (!roles || roles.length === 0) {
            return res.status(404).json({ message: 'No roles found' });
        }
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getAllDeps(req, res){
    try{
        const Deps = await getDeps();
        return res.status(200).json(Deps);
    } catch (error) {
    console.error('Error fetching deps:', error);
    res.status(500).json({ error: 'Internal server error' });
}
}

async function updateRoles(roles) {
    
    try {
        for (const hrRole of roles) {
            const existingRole = await RoleModel.findOne({ _id: hrRole._id  });

            if (existingRole) {
                // Role exists, check if any updates needed
                if (existingRole.roleName !== hrRole.roleName) {
                    // Update the role ID if it has changed
                    await RoleModel.findByIdAndUpdate(existingRole._id, {roleName: hrRole.roleName });
                }
                if (existingRole.depId !== hrRole.depId){
                    await RoleModel.findByIdAndUpdate(existingRole._id, {depId: hrRole.depId });
                }
            } else {
                // Role doesn't exist, create it
                const newRole = new RoleModel({
                    _id: hrRole._id,
                    roleName: hrRole.roleName,
                    depId: hrRole.depId,
                });
                await newRole.save();
            }
        }
    } catch (error) {
        console.error('Error updating roles:', error);
        throw new Error('Error updating roles');
    }
}

// Delete Roles
async function deleteRoles(hrRoles) {
    try {
        const existingRoles = await RoleModel.find({});
        for (const existingRole of existingRoles) {
            // Check if the role exists in HR roles
            const found = hrRoles.find(hrRole => hrRole._id.equals(existingRole._id));
            if (!found) {
                // Role doesn't exist in HR roles, delete it
                await RoleModel.findByIdAndDelete(existingRole._id);
            }
        }
    } catch (error) {
        console.error('Error deleting roles:', error);
        throw new Error('Error deleting roles');
    }
}


export async function getRoles(req, res) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();

        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const roles = await collection.find({}).toArray();

        if (!roles || roles.length === 0) return res.status(404).send({ error: "No roles found" });

        // Extract relevant user data (username, email, and role)
        const sanitizedRoles = roles.map(role => {
            const { _id, roleName, depId } = role; // Extract only desired fields
            return { _id, roleName, depId};
        });

        return sanitizedRoles; // Send role data to the client
    } catch (error) {
        console.error('Error occurred while fetching role information:', error);
        return { error: "Internal Server Error" };
    } finally {
        // Close the connection
        await client.close();
    }
}

export async function getDeps(req, res){
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();

        const database = client.db(dbName);
        const collection = database.collection('Department');

        const deps = await collection.find({}).toArray();

        if (!deps || deps.length === 0) return { error: "No deps found" };

        const sanitizedDeps = deps.map(dep => {
            const { _id, name } = dep; // Extract only desired fields
            return { _id, name};
        });

        return sanitizedDeps; // Send dep data to the client
    } catch (error) {
        console.error('Error occurred while fetching role information:', error);
        return { error: "Internal Server Error" };
    } finally {
        // Close the connection
        await client.close();
    }
}



export async function getRoleById(req, res) {
    const roleId = req.params.id;

    try {
        const role = await RoleModel.findById(roleId);
        
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.status(200).json(role);
    } catch (error) {
        console.error('Error fetching role by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getAllRolesByDepId(req, res) {
    const depId = req.params.id;

    try {
        const role = await RoleModel.find({depId: depId});
        
        if ( role.length === 0) {
            return res.status(404).json({ error: 'Roles not found' });
        }

       return res.status(200).json(role);
    } catch (error) {
        console.error('Error fetching role by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Controller function to create a committee
export async function createCommittee (req, res) {
    const { name, members, chairperson } = req.body;

    try {
        // Create a new committee instance
        const committee = new Committee({
            name,
            members,
            chairperson
        });

        // Save the committee to the database
        const savedCommittee = await committee.save();

        res.status(201).json(savedCommittee);
    } catch (error) {
        console.error('Error creating committee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export async function getAllCommittee(req, res) {
    try {
        
        const committee = await Committee.find({});
        res.status(200).json(committee);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
export default {
  getRoleById,
  getAllRoles,
  createCommittee
  };