import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NoiseParametersPanel } from './NoiseParametersPanel'

describe('NoiseParametersPanel', () => {
  it('should call onGenerate with updated parameters when sliders change and Generate is clicked', async () => {
    const onGenerate = vi.fn()

    render(
      <NoiseParametersPanel
        onGenerate={onGenerate}
        initialParameters={{
          seed: 42,
          frequency: 0.05,
          amplitude: 50,
          octaves: 6
        }}
      />
    )

    // Find the frequency slider
    const frequencySlider = screen.getByLabelText(/frequency/i) as HTMLInputElement

    // Change frequency from 0.05 to 0.1
    fireEvent.change(frequencySlider, { target: { value: '0.1' } })

    // Verify the slider value changed
    expect(frequencySlider.value).toBe('0.1')

    // Find and click the Generate button
    const generateButton = screen.getByRole('button', { name: /generate terrain/i })
    fireEvent.click(generateButton)

    // onGenerate should be called with the NEW parameters
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledTimes(1)
      expect(onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          seed: 42,
          frequency: 0.1, // NEW value
          amplitude: 50,
          octaves: 6
        })
      )
    })
  })

  it('should call onGenerate with updated amplitude when amplitude slider changes', async () => {
    const onGenerate = vi.fn()

    render(
      <NoiseParametersPanel
        onGenerate={onGenerate}
        initialParameters={{
          seed: 42,
          frequency: 0.05,
          amplitude: 50,
          octaves: 6
        }}
      />
    )

    // Find the amplitude slider
    const amplitudeSlider = screen.getByLabelText(/amplitude/i) as HTMLInputElement

    // Change amplitude from 50 to 100
    fireEvent.change(amplitudeSlider, { target: { value: '100' } })

    // Verify the slider value changed
    expect(amplitudeSlider.value).toBe('100')

    // Find and click the Generate button
    const generateButton = screen.getByRole('button', { name: /generate terrain/i })
    fireEvent.click(generateButton)

    // onGenerate should be called with the NEW amplitude
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          amplitude: 100 // NEW value
        })
      )
    })
  })

  it('should call onGenerate with updated octaves when octaves slider changes', async () => {
    const onGenerate = vi.fn()

    render(
      <NoiseParametersPanel
        onGenerate={onGenerate}
        initialParameters={{
          seed: 42,
          frequency: 0.05,
          amplitude: 50,
          octaves: 4
        }}
      />
    )

    // Find the octaves slider
    const octavesSlider = screen.getByLabelText(/octaves/i) as HTMLInputElement

    // Change octaves from 4 to 8
    fireEvent.change(octavesSlider, { target: { value: '8' } })

    // Verify the slider value changed
    expect(octavesSlider.value).toBe('8')

    // Find and click the Generate button
    const generateButton = screen.getByRole('button', { name: /generate terrain/i })
    fireEvent.click(generateButton)

    // onGenerate should be called with the NEW octaves
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          octaves: 8 // NEW value
        })
      )
    })
  })

  it('should call onGenerate with updated seed when seed input changes', async () => {
    const onGenerate = vi.fn()

    render(
      <NoiseParametersPanel
        onGenerate={onGenerate}
        initialParameters={{
          seed: 42,
          frequency: 0.05,
          amplitude: 50,
          octaves: 6
        }}
      />
    )

    // Find the seed input
    const seedInput = screen.getByPlaceholderText(/enter integer seed/i) as HTMLInputElement

    // Change seed from 42 to 999
    fireEvent.change(seedInput, { target: { value: '999' } })
    fireEvent.blur(seedInput) // Trigger validation

    // Find and click the Generate button
    const generateButton = screen.getByRole('button', { name: /generate terrain/i })
    fireEvent.click(generateButton)

    // onGenerate should be called with the NEW seed
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          seed: 999 // NEW value
        })
      )
    })
  })
})
