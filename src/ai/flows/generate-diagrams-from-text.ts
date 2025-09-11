'use server';
/**
 * @fileOverview AI agent that generates diagram data from a text prompt.
 *
 * - generateDiagram - A function that generates diagram data.
 * - GenerateDiagramInput - The input type for the generateDiagram function.
 * - GenerateDiagramOutput - The return type for the generateDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDiagramInputSchema = z.object({
  diagramType: z
    .enum(['MindMap', 'Flowchart', 'OrgChart'])
    .describe('The desired type of diagram to generate.'),
  instruction: z.string().describe('The user instruction for what to generate.'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagramData: z
    .string()
    .describe(
      'A JSON string representing the diagram data, compatible with the rendering library. It must contain "nodes" and "edges" arrays.'
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
  prompt: `You are an expert AI assistant specializing in creating diagrams.
Your task is to interpret a user's instruction and generate a valid JSON string that represents the diagram data.

CRITICAL INSTRUCTIONS:
1.  **Analyze the user's instruction** to understand the entities and their relationships.
2.  **Output Format:** Your final output MUST be a single, valid JSON object containing "diagramData" and "response".
    - \`diagramData\`: This MUST be a JSON-escaped string containing the complete nodes and edges for the diagram.
    - \`response\`: A friendly, conversational string explaining what you did (e.g., "I've created the mind map for you.").

3.  **Diagram Generation:**
    - Create a deep, hierarchical structure. Go at least 3-4 levels deep if the instruction allows.
    - **Nodes:** Each node MUST have a unique \`id\`, a \`label\`, a detailed \`description\`, and a relative \`x\` and \`y\` position (from 0 to 100). You can also add a 'color' property (hex or tailwind color class) for thematic coloring.
    - **Edges:** Each edge MUST have a unique \`id\`, a \`from\`, and a \`to\` property, referencing node IDs.

**CONTEXT FOR THIS REQUEST:**
- **Diagram Type:** {{{diagramType}}}
- **User's Instruction:** "{{{instruction}}}"

Now, fulfill the user's request. Remember to provide the complete diagram in the "diagramData" field and a friendly message in the "response" field.
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
        console.error("Error in generateDiagramFlow", e);
        if (e.message && (e.message.includes('503') || e.message.toLowerCase().includes('model is overloaded'))) {
            throw new Error("The AI service is currently overloaded. Please wait a moment and try again.");
        }
        throw new Error("An unexpected error occurred while generating the diagram.");
    }
  }
);
