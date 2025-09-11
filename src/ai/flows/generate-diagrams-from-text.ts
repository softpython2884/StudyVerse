'use server';
/**
 * @fileOverview AI agent that generates or modifies diagram data from a text prompt.
 *
 * - generateDiagram - A function that generates or modifies diagram data.
 * - GenerateDiagramInput - The input type for the generateDiagram function.
 * - GenerateDiagramOutput - The return type for the generateDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDiagramInputSchema = z.object({
  diagramType: z
    .enum(['MindMap', 'Flowchart', 'OrgChart'])
    .describe('The desired type of diagram to generate.'),
  instruction: z.string().describe('The user instruction for what to generate or modify.'),
  complexity: z.enum(['Simple', 'Detailed', 'Exhaustive']).optional().describe('The desired complexity and level of detail for the diagram.'),
  existingDiagramData: z.string().optional().describe('A JSON string of the existing diagram data (nodes and edges) to be modified. If this is provided, the instruction should be treated as a modification request.'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagramData: z
    .string()
    .describe(
      'A JSON string representing the complete, updated diagram data, compatible with the rendering library. It must contain "nodes" and "edges" arrays.'
    ),
    response: z.string().describe("A conversational response to the user explaining what was done.")
});
export type GenerateDiagramOutput = z.infer<typeof GenerateDiagramOutputSchema>;

export async function generateDiagram(
  input: GenerateDiagramInput
): Promise<GenerateDiagramOutput> {
  return generateDiagramFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDiagramPrompt',
  input: {schema: GenerateDiagramInputSchema},
  output: {schema: GenerateDiagramOutputSchema},
  prompt: `You are an expert AI assistant and researcher specializing in creating and modifying diagrams.
Your task is to interpret a user's instruction, research the topic thoroughly, and generate a valid, highly-detailed JSON string that represents the diagram data.

CRITICAL INSTRUCTIONS:
1.  **Analyze and Research:** Deeply analyze the user's instruction. Use your internal knowledge base as if you were searching the internet (like Wikipedia) to gather comprehensive information on the topic. Your goal is to produce a rich, educational diagram.
2.  **Adhere to Complexity:** The user has specified a desired complexity level. You MUST adhere to it.
    - **Simple:** Provide a high-level overview. Include only the most critical points (approx. 5-10 nodes).
    - **Detailed:** Provide a comprehensive diagram. Go 2-3 levels deep with significant detail (approx. 15-30 nodes). This is the default.
    - **Exhaustive:** Create a very deep, hierarchical structure. Go 4+ levels deep, covering the topic extensively (40+ nodes).
3.  **Generate Detailed Content:** For each node in the diagram, you MUST provide a detailed \`description\`. This is not optional. The description should be a comprehensive summary explaining the "what, why, how," and the history of the item. For example, if the user asks for "major figures of the Spanish colonization," for each person, describe who they were, what they did, their motivations, goals, and historical impact.
4.  **Check for Existing Data:**
    - **If "existingDiagramData" is provided:** You MUST treat this as a modification request. Modify the provided JSON based on the new "instruction". Do not start from scratch. Add, remove, or change nodes and edges as requested.
    - **If "existingDiagramData" is NOT provided:** Generate a new diagram from scratch based on the "instruction".
5.  **Output Format:** Your final output MUST be a single, valid JSON object containing "diagramData" and "response".
    - \`diagramData\`: This MUST be a JSON-escaped string containing the complete nodes and edges for the diagram.
    - \`response\`: A friendly, conversational string explaining what you did (e.g., "I've created a detailed mind map for you about Spanish Colonization.").

6.  **Diagram Generation & Layout:**
    - Create a clear, spatially-aware layout. For mind maps, radiate from a central point. **CRITICAL: Ensure nodes do not overlap. Assume each node is about 200px wide and 100px high and leave ample space between them.**
    - **Nodes:** Each node MUST have a unique \`id\`, a \`label\`, a detailed \`description\`, and a relative \`x\` and \`y\` position (from 0 to 100). You can also add a 'color' property (hex or tailwind color class) for thematic coloring.
    - **Edges:** Each edge MUST have a unique \`id\`, a \`from\`, and a \`to\` property, referencing node IDs.

**CONTEXT FOR THIS REQUEST:**
- **Diagram Type:** {{{diagramType}}}
- **Desired Complexity:** {{{complexity}}}
- **User's Instruction:** "{{{instruction}}}"
{{#if existingDiagramData}}
- **Existing Diagram Data to Modify:**
\`\`\`json
{{{existingDiagramData}}}
\`\`\`
{{/if}}

Now, fulfill the user's request. Remember to adhere to the complexity level, research the topic thoroughly, provide a complete, updated diagram in the "diagramData" field, and a friendly message in the "response" field.
`,
});

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (e: any) {
        console.error("Error in generateDiagramFlow:", e);
        const errorMessage = e.message?.toLowerCase() || '';

        if (errorMessage.includes('503') || errorMessage.includes('model is overloaded')) {
            throw new Error("The AI service is currently overloaded. Please wait a moment and try again.");
        }
        if (errorMessage.includes('429')) {
             throw new Error("You've made too many requests recently. Please wait a bit before trying again.");
        }
        if (errorMessage.includes('safety')) {
            throw new Error("The request was blocked due to safety concerns. Please modify your prompt and try again.");
        }
        if (errorMessage.includes('400')) {
            throw new Error("The request was invalid. Please check your instructions and try again.");
        }

        throw new Error("An unexpected error occurred while generating the diagram.");
    }
  }
);
