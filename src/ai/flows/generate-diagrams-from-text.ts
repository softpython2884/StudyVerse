'use server';
/**
 * @fileOverview AI agent that generates diagram data from text for React Flow.
 *
 * - generateDiagram - A function that generates diagrams from text.
 * - GenerateDiagramInput - The input type for the generateDiagram function.
 * - GenerateDiagramOutput - The return type for the generateDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDiagramInputSchema = z.object({
  text: z.string().describe('The text to generate a diagram from.'),
  diagramType: z
    .enum(['MindMap', 'Flowchart', 'OrgChart'])
    .describe('The desired type of diagram to generate.'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagramData: z
    .string()
    .describe(
      'A JSON string representing the diagram data, compatible with the React Flow library. It must contain "nodes" and "edges" arrays.'
    ),
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
  prompt: `You are an expert data structure generator for diagrams, specifically for the React Flow library.
Your task is to convert a natural language description into a valid JSON string that represents the data for a specified diagram type.
The JSON must contain 'nodes' and 'edges' arrays.

The user wants to generate a {{{diagramType}}} based on the following text:
Text: {{{text}}}

CRITICAL INSTRUCTIONS:
1.  **Analyze the text** to identify key concepts, entities, and their relationships.
2.  **Create a deep, hierarchical structure**, especially for MindMap and OrgChart. Go at least 3-4 levels deep if the text allows.
3.  **Generate 'nodes' array:**
    - Each node MUST have a unique \`id\` (string).
    - Each node MUST have a \`data.label\` (string) for its title.
    - Each node MUST have a \`data.description\` (string) containing a detailed, researched explanation of that concept.
    - Each node MUST have a \`position\` object with \`x\` and \`y\` coordinates. You must calculate logical positions to create a clean, readable, and non-overlapping layout. For a mind map, this is typically a radial layout. For a flowchart or org chart, this is typically top-down.
    - For OrgChart, you can also add a \`data.parent\` field with the parent node ID.
    - Advanced: You can add a 'type' for nodes (e.g., 'input', 'output', 'default') and a 'style' object for custom appearances (e.g., backgroundColor, borderColor).
4.  **Generate 'edges' array:**
    - Each edge MUST have a unique \`id\` (e.g., "e1-2").
    - Each edge MUST have a \`source\` (the parent node's id).
    - Each edge MUST have a \`target\` (the child node's id).
    - Edges should have \`type: 'smoothstep'\` for better curves.
    - Advanced: You can add a \`label\` to an edge to describe the relationship.

The output MUST be a single, valid JSON string, with no additional text, explanations, or markdown.

Example React Flow JSON:
{
  "nodes": [
    { "id": "1", "type": "default", "data": { "label": "Central Idea", "description": "This is the core concept..." }, "position": { "x": 250, "y": 5 }, "style": { "backgroundColor": "#ffcc00" } },
    { "id": "2", "type": "default", "data": { "label": "Branch 1", "description": "Explanation for branch 1..." }, "position": { "x": 100, "y": 100 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "type": "smoothstep", "label": "leads to" }
  ]
}

Now, analyze the user's text and produce the corresponding JSON string.
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
        throw new Error("Failed to generate diagram: " + e.message);
    }
  }
);
