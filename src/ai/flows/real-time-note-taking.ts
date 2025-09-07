'use server';
/**
 * @fileOverview This file defines a Genkit flow for real-time speech-to-text note-taking.
 *
 * - realTimeNoteTaking - A function that converts speech to text.
 * - RealTimeNoteTakingInput - The input type for the realTimeNoteTaking function.
 * - RealTimeNoteTakingOutput - The return type for the realTimeNoteTaking function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeNoteTakingInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RealTimeNoteTakingInput = z.infer<typeof RealTimeNoteTakingInputSchema>;

const RealTimeNoteTakingOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio.'),
});
export type RealTimeNoteTakingOutput = z.infer<typeof RealTimeNoteTakingOutputSchema>;

export async function realTimeNoteTaking(input: RealTimeNoteTakingInput): Promise<RealTimeNoteTakingOutput> {
  return realTimeNoteTakingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'realTimeNoteTakingPrompt',
  input: {schema: RealTimeNoteTakingInputSchema},
  output: {schema: RealTimeNoteTakingOutputSchema},
  prompt: `Transcribe the following audio data to text:

Audio: {{media url=audioDataUri}}`,
});

const realTimeNoteTakingFlow = ai.defineFlow(
  {
    name: 'realTimeNoteTakingFlow',
    inputSchema: RealTimeNoteTakingInputSchema,
    outputSchema: RealTimeNoteTakingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
