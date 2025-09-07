'use server';
/**
 * @fileOverview This file contains a Genkit flow for refining and structuring notes into well-organized course documents using AI.
 *
 * - refineAndStructureNotes - An async function that takes raw notes as input and returns refined, structured notes.
 * - RefineAndStructureNotesInput - The input type for the refineAndStructureNotes function, representing the raw notes to be processed.
 * - RefineAndStructureNotesOutput - The output type for the refineAndStructureNotes function, representing the refined and structured notes.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineAndStructureNotesInputSchema = z.object({
  rawNotes: z.string().describe('The raw, unstructured notes to be refined and structured.'),
});
export type RefineAndStructureNotesInput = z.infer<typeof RefineAndStructureNotesInputSchema>;

const RefineAndStructureNotesOutputSchema = z.object({
  refinedNotes: z.string().describe('The refined and structured notes, organized for better studying.'),
});
export type RefineAndStructureNotesOutput = z.infer<typeof RefineAndStructureNotesOutputSchema>;

export async function refineAndStructureNotes(input: RefineAndStructureNotesInput): Promise<RefineAndStructureNotesOutput> {
  return refineAndStructureNotesFlow(input);
}

const refineAndStructureNotesPrompt = ai.definePrompt({
  name: 'refineAndStructureNotesPrompt',
  input: {schema: RefineAndStructureNotesInputSchema},
  output: {schema: RefineAndStructureNotesOutputSchema},
  prompt: `You are an AI assistant designed to refine and structure student notes into well-organized course documents.

  Please take the following raw notes and organize them into a coherent and structured format, suitable for studying. Use headings, subheadings, bullet points, and numbered lists where appropriate to improve readability and understanding.

  Raw Notes:
  {{rawNotes}}

  Refined and Structured Notes:`,
});

const refineAndStructureNotesFlow = ai.defineFlow(
  {
    name: 'refineAndStructureNotesFlow',
    inputSchema: RefineAndStructureNotesInputSchema,
    outputSchema: RefineAndStructureNotesOutputSchema,
  },
  async input => {
    const {output} = await refineAndStructureNotesPrompt(input);
    return output!;
  }
);
