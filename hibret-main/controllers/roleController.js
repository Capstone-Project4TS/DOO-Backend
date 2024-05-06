//import { func } from "joi";
import RoleModel from "../models/role.model.js";
import { MongoClient } from "mongodb";

const uri =  "mongodb+srv://root:root@cluster0.nchnoj6.mongodb.net/HR";
const dbName = "HR";
const collectionName = "Role";


export async function getAllRoles(req, res) {
    try {
        const Roles = await getRoles();
        await updateRoles(Roles);
        await deleteRoles(Roles);
        const roles = await RoleModel.find({});
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
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
            } else {
                // Role doesn't exist, create it
                const newRole = new RoleModel({
                    _id: hrRole._id,
                    roleName: hrRole.roleName,
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
            const { _id, roleName } = role; // Extract only desired fields
            return { _id, roleName};
        });

        return sanitizedRoles; // Send role data to the client
    } catch (error) {
        console.error('Error occurred while fetching role information:', error);
        return res.status(500).send({ error: "Internal Server Error" });
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
export default {
  getRoleById,
  getAllRoles,

  };