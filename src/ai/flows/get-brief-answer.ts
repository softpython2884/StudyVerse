'use server';
/**
 * @fileOverview An AI agent that provides a brief answer to a question.
 *
 * - getBriefAnswer - A function that provides a concise answer to a question.
 * - GetBriefAnswerInput - The input type for the function.
 * - GetBriefAnswerOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetBriefAnswerInputSchema = z.object({
  question: z.string().describe('The user question to answer.'),
});
export type GetBriefAnswerInput = z.infer<typeof GetBriefAnswerInputSchema>;

const GetBriefAnswerOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'A brief, concise, and factual answer to the question. Should be a single sentence or two at most.'
    ),
});
export type GetBriefAnswerOutput = z.infer<typeof GetBriefAnswerOutputSchema>;

export async function getBriefAnswer(
  input: GetBriefAnswerInput
): Promise<GetBriefAnswerOutput> {
  return getBriefAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getBriefAnswerPrompt',
  input: {schema: GetBriefAnswerInputSchema},
  output: {schema: GetBriefAnswerOutputSchema},
  prompt: `Answer the following question very concisely and factually.
The answer should be as short as possible, providing only the essential information.
Do not add any preamble or explanation. Just the answer.

Question: {{{question}}}
`,
});

const getBriefAnswerFlow = ai.defineFlow(
  {
    name: 'getBriefAnswerFlow',
    inputSchema: GetBriefAnswerInputSchema,
    outputSchema: GetBriefAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
