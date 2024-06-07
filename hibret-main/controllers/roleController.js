//import { func } from "joi";
import RoleModel from "../models/role.model.js";
import Committee from "../models/committee.model.js";
import { MongoClient } from "mongodb";

const uri = "mongodb+srv://root:root@cluster0.nchnoj6.mongodb.net/HR";
const dbName = "HR";
const collectionName = "Role";

export async function updateAllRoles() {
  try {
    const roles = await getRoles();
    
    
    if(roles.error){
      return { message: "Error occurred while fetching role information." };
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      return { message: "Please provide roles data." };
    }
    const updateResults = await updateRoles(roles);
    const deleteResults = await deleteRoles(roles);

    return {
      message: "Roles synchronization completed successfully",
      updateResults,
      deleteResults,
    };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return { error: "Internal server error" };
  }
}

export async function getAllRoles(req, res) {
  try {
    const roles = await RoleModel.find({});
    if (!roles || roles.length === 0) {
      console.warn("No roles found.");
      return res.status(404).json({ message: "No roles found" });
    }
    res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


// Function to handle the API request and response for fetching departments
export async function getAllDeps(req, res) {
  try {
    const deps = await getDeps();
    if (!deps || deps.length === 0) {
      console.warn("No departments found.");
      return res.status(404).json({ message: "No departments found" });
    }
    return res.status(200).json(deps);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


async function updateRoles(roles) {
  try {
    const updateResults = [];

    for (const hrRole of roles) {
      const existingRole = await RoleModel.findOne({ _id: hrRole._id });

      if (existingRole) {
        // Role exists, check if any updates needed
        const updates = {};
        if (existingRole.roleName !== hrRole.roleName) {
          updates.roleName = hrRole.roleName;
        }
        if (existingRole.depId.toString() !== hrRole.depId.toString()) {
          updates.depId = hrRole.depId;
        }

        if (Object.keys(updates).length > 0) {
          await RoleModel.findByIdAndUpdate(existingRole._id, { $set: updates });
          updateResults.push({ _id: existingRole._id, updates });
          console.log(`Updated role ${existingRole._id}`);
        }
      } else {
        // Role doesn't exist, create it
        const newRole = new RoleModel({
          _id: hrRole._id,
          roleName: hrRole.roleName,
          depId: hrRole.depId,
        });
        await newRole.save();
        updateResults.push({ _id: hrRole._id, created: true });
        console.log(`Created new role ${hrRole._id}`);
      }
    }

    return updateResults;
  } catch (error) {
    console.error("Error updating roles:", error);
    throw new Error("Error updating roles");
  }
}

async function deleteRoles(hrRoles) {
  try {
    const deleteResults = [];
    const existingRoles = await RoleModel.find({});

    for (const existingRole of existingRoles) {
      // Check if the role exists in HR roles
      const found = hrRoles.find((hrRole) => hrRole._id.toString() === existingRole._id.toString());
      if (!found) {
        // Role doesn't exist in HR roles, delete it
        await RoleModel.findByIdAndDelete(existingRole._id);
        deleteResults.push({ _id: existingRole._id, deleted: true });
        console.log(`Deleted role ${existingRole._id}`);
      }
    }

    return deleteResults;
  } catch (error) {
    console.error("Error deleting roles:", error);
    throw new Error("Error deleting roles");
  }
}


export async function getRoles() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    const roles = await collection.find({}).toArray();

    if (!roles || roles.length === 0) {
      return { error: "No roles found" };
    }

    const sanitizedRoles = roles.map((role) => {
      const { _id, roleName, depId } = role;
      return { _id, roleName, depId };
    });

    return sanitizedRoles;
  } catch (error) {
    console.error("Error occurred while fetching role information:", error);
    return { error: "Internal Server Error" };
  } finally {
    await client.close();
  }
}


export async function getDeps(req, res) {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection("Department");

    const deps = await collection.find({}).toArray();

    const sanitizedDeps = deps.map((dep) => {
      const { _id, name } = dep;
      return { _id, name };
    });

    return sanitizedDeps;
  } catch (error) {
    console.error("Error occurred while fetching department information:", error);
    return { error: "Internal Server Error" };
  } finally {
    await client.close();
  }
}


export async function getRoleById(req, res) {
  const roleId = req.params.id;

  try {
    const role = await RoleModel.findById(roleId);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    return res.status(200).json(role);
  } catch (error) {
    console.error("Error fetching role by ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}


export async function getAllRolesByDepId(req, res) {
  const depId = req.params.id;

  try {
    const roles = await RoleModel.find({ depId: depId });

    if (!roles || roles.length === 0) {
      return res.status(404).json({ error: "Roles not found" });
    }

    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles by department ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}



// Controller function to create a committee
export async function createCommittee(req, res) {
  const { name, members, chairperson } = req.body;

  try {
    // Create a new committee instance
    const committee = new Committee({
      name,
      members,
      chairperson,
    });

    // Save the committee to the database
    const savedCommittee = await committee.save();

    res.status(201).json(savedCommittee);
  } catch (error) {
    console.error("Error creating committee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllCommittee(req, res) {
  try {
    const committee = await Committee.find({});
    res.status(200).json(committee);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Add Permissions to Role
export async function addPermission(req, res) {
  const { roleId } = req.params;
  const { permissions } = req.body;

  RoleModel.findById(roleId)
    .then((role) => {
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Filter out permissions that already exist in the role
      const newPermissions = permissions.filter(
        (permission) => !role.permissions.includes(permission)
      );

      // Add new permissions to the role
      role.permissions = role.permissions.concat(newPermissions);

      return role.save();
    })
    .then(() => {
      res.status(200).json({ message: "Permissions added successfully" });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
}

// Remove Permission from Role
// app.delete('/roles/:roleId/permissions/:permissionName',
export async function removePermission(req, res) {
  const { roleId, permissionName } = req.params;

  RoleModel.findById(roleId)
    .then((role) => {
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      role.permissions = role.permissions.filter(
        (perm) => perm !== permissionName
      );
      return role.save();
    })
    .then(() => {
      res.status(200).json({ message: "Permission removed successfully" });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
}

export default {
  getRoleById,
  getAllRoles,
  createCommittee,
  getAllDeps,
  getDeps,
};
