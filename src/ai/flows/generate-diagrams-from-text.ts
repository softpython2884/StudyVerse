'use server';
/**
 * @fileOverview AI agent that generates and modifies diagram data from text for React Flow.
 *
 * - generateDiagram - A function that generates or modifies diagrams from text.
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
  currentDiagram: z.string().optional().describe('A JSON string representing the current diagram data (nodes and edges). This is used for modifications.'),
  chatHistory: z.string().optional().describe('A JSON string of the previous conversation history, for context.')
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagramData: z
    .string()
    .describe(
      'A JSON string representing the final, complete diagram data, compatible with the React Flow library. It must contain "nodes" and "edges" arrays.'
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
  prompt: `You are an expert AI assistant specializing in creating and modifying diagrams for the React Flow library.
Your task is to interpret a user's instruction and generate or update a valid JSON string that represents the diagram data.

CRITICAL INSTRUCTIONS:
1.  **Analyze the user's instruction** in the context of the chat history and the current diagram state.
2.  **Output Format:** Your final output MUST be a single, valid JSON object containing two keys: "diagramData" and "response".
    - \`diagramData\`: This MUST be a JSON-escaped string containing the complete, updated nodes and edges for the diagram. Do NOT output a partial diagram or just the changes. Output the full final state.
    - \`response\`: This MUST be a friendly, conversational string explaining what you did.

3.  **Diagram Generation (if currentDiagram is empty):**
    - Create a deep, hierarchical structure. Go at least 3-4 levels deep if the instruction allows.
    - **Nodes:** Each node MUST have a unique \`id\`, a \`position\` {x, y}, and \`data\` containing a \`label\` and a detailed \`description\`. Calculate logical positions for a clean layout (radial for MindMap, top-down for Flowchart/OrgChart).
    - **Edges:** Each edge MUST have a unique \`id\`, a \`source\`, and a \`target\`. Use \`type: 'smoothstep'\`.

4.  **Diagram Modification (if currentDiagram is provided):**
    - Parse the \`currentDiagram\` JSON string to understand the existing structure.
    - Apply the user's instruction (add, remove, or modify nodes/edges).
    - **Recalculate positions** of affected nodes to maintain a clean and readable layout. Do not let nodes overlap.
    - **Maintain existing IDs** for nodes that are not removed. Generate new unique IDs for new nodes/edges.
    - Return the **entire, new state** of the diagram in the \`diagramData\` field.

5.  **User Interaction:**
    - The \`instruction\` is the latest request from the user.
    - The \`chatHistory\` provides context for the conversation. Use it to understand follow-up requests.
    - Your \`response\` should be concise and helpful.

**CONTEXT FOR THIS REQUEST:**
- **Diagram Type:** {{{diagramType}}}
- **Chat History:**
{{{chatHistory}}}
- **Current Diagram JSON:**
\`\`\`json
{{{currentDiagram}}}
\`\`\`
- **User's Latest Instruction:** "{{{instruction}}}"

Now, fulfill the user's request. Remember to provide the complete, updated diagram in the "diagramData" field and a friendly message in the "response" field.
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
        // Provide default empty values if not present
        const flowInput = {
            ...input,
            currentDiagram: input.currentDiagram || '{ "nodes": [], "edges": [] }',
            chatHistory: input.chatHistory || '[]'
        };
      const {output} = await prompt(flowInput);
      return output!;
    } catch (e: any) {
        console.error("Error in generateDiagramFlow", e);
        throw new Error("Failed to generate diagram: " + e.message);
    }
  }
);
