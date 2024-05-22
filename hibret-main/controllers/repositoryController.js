import Repository from "../models/repository.model.js";
// import { getDeps } from "./roleController.js";
import UserModel from '../models/users.model.js';

// export async function createRepositories() {
//     try {
//       const Deps = await getDeps();
//       if (Deps) {
//         for (const dep of Deps) {
//           const { name ,_id} = dep;
  
//           // Check if repository exists
//           const existingRepo = await Repository.findOne({ name });
  
//           if (!existingRepo) {
//             // Create new repository
//             const newRepo =new Repository({
//               name: name,
//               departmentId: _id,
//               categories: [], // Initialize with empty categories
//             });
  
//             await newRepo.save();
//           }
//         }
  
//         return { message: "Repositories created or updated successfully" };
//       }
//     } catch (error) {
//       console.error("Error occurred while creating repositories:", error);
//       return { error: "Internal Server Error" };
//     }
//   }
  

// Function to handle the API request and response for creating repositories


export async function getRepos(req, res) {
    try {
        const result = await Repository.find();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error creating repositories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


// Controller function to fetch repositories with folders and workflows
export const fetchRepositories = async (req, res) => {
    try {
        // Validate userId from the token
        if (!req.user || !req.user.userId) {
          return res.status(401).json({ error: 'Unauthorized access, no user ID found in token.' });
        }
    
        // Retrieve user and role information
        const user = await UserModel.findById(req.user.userId).populate({
          path: 'role_id',
          populate: { path: 'depId' }
        });
    
        if (!user) {
          return res.status(404).json({ error: 'User not found.' });
        }
    
        if (!user.role_id || !user.role_id.depId) {
          return res.status(400).json({ error: 'User does not have an assigned department.' });
        }
    
        const departmentId = user.role_id.depId._id;
    
        // Retrieve repositories by department
        const repositories = await Repository.find({ department: departmentId }).populate({
          path: 'categories',
          populate: {
            path: 'subcategories',
            populate: {
              path: 'folders',
              populate: {
                path: 'workflows'
              }
            }
          }
        });
    
        if (!repositories || repositories.length === 0) {
          return res.status(404).json({ error: 'No repositories found for this department.' });
        }
    
        const hierarchicalData = repositories.map(repository => ({
          name: repository.name,
          categories: repository.categories.map(category => ({
            name: category.name,
            subcategories: category.subcategories.map(subcategory => ({
              name: subcategory.name,
              folders: subcategory.folders.map(folder => ({
                name: folder.name,
                workflows: folder.workflows.map(workflow => workflow.name)
              }))
            }))
          }))
        }));
    
        return res.status(200).json(hierarchicalData);
      } catch (error) {
        console.error('Error fetching repositories with folders and workflows:', error);
        return res.status(500).json({ error: 'Internal server error.' });
      }
};


export default{
    getRepos,
    // createRepositories,
    fetchRepositories
}