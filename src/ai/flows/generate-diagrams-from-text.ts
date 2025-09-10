'use server';
/**
 * @fileOverview AI agent that generates diagram data from text.
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
    .enum(['MindMap', 'Flowchart', 'OrgChart', 'VennDiagram', 'Timeline'])
    .describe('The desired type of diagram to generate.'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagramData: z
    .string()
    .describe(
      'A JSON string representing the diagram data (nodes, edges, etc.), compatible with the specified diagram type component.'
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
  prompt: `You are an expert data structure generator for diagrams.
Your task is to convert a natural language description into a valid JSON string that represents the data for a specified diagram type. The JSON must be compatible with a React component that will render the diagram.

The output MUST be a single JSON string, with no additional text, explanations, or markdown.

Generate the data for a {{{diagramType}}} based on the following text:
Text: {{{text}}}

Follow these schemas for the JSON output:

- For "MindMap" or "Flowchart":
  {
    "nodes": [{ "id": "string", "label": "string", "x": number (percentage 0-100), "y": number (percentage 0-100) }],
    "edges": [{ "from": "string (node id)", "to": "string (node id)" }]
  }

- For "OrgChart":
  {
    "nodes": [{ "id": "string", "label": "string", "parent": "string (optional parent id)" }]
  }

- For "VennDiagram":
  {
    "sets": [{ "id": "string", "label": "string", "size": number (optional) }]
  }

- For "Timeline":
  {
    "items": [{ "id": "string", "label": "string", "date": "string (optional)" }]
  }

Analyze the text and produce the corresponding JSON string.
`,
});

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
