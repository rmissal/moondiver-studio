import sys
import json
import numpy as np

# Hide librosa warnings
import warnings
warnings.filterwarnings('ignore')

try:
    import librosa
    import scipy.signal
except ImportError:
    print(json.dumps({"status": "error", "message": "Missing dependencies. Run: pip install librosa scipy numpy"}))
    sys.exit(1)

def get_chord_templates():
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    templates = []
    chord_names = []
    
    # Define chord structures by semitone intervals from root
    chord_types = {
        '': [0, 4, 7],             # Major
        'm': [0, 3, 7],            # Minor
        '7': [0, 4, 7, 10],        # Dominant 7
        'maj7': [0, 4, 7, 11],     # Major 7
        'm7': [0, 3, 7, 10],       # Minor 7
        'add9': [0, 2, 4, 7],      # Add 9 (1, 2/9, 3, 5)
        'sus4': [0, 5, 7]          # Sus 4
    }
    
    for i in range(12):
        for suffix, intervals in chord_types.items():
            template = np.zeros(12)
            for interval in intervals:
                template[interval] = 1
                
            template = np.roll(template, i)
            templates.append(template)
            chord_names.append(notes[i] + suffix)
            
    return np.array(templates), chord_names

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No input file provided"}))
        return

    filepath = sys.argv[1]
    
    try:
        # Load audio (downsample for performance)
        y, sr = librosa.load(filepath, sr=22050)
        
        # Extract Harmonic part to avoid drums confusing the pitch
        y_harmonic, _ = librosa.effects.hpss(y)
        
        # Compute Chromagram
        chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr)
        
        # We only use beat tracking to get the BPM for the UI, and to snap chords to grid
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo[0]) if isinstance(tempo, np.ndarray) else float(tempo)
        
        templates, chord_names = get_chord_templates()
        
        chroma_sync = librosa.util.sync(chroma, beat_frames, aggregate=np.median)
        chroma_norm = librosa.util.normalize(chroma_sync, norm=2, axis=0)
        templates_norm = librosa.util.normalize(templates, norm=2, axis=1)
        
        # Microscopic tie-breaker (0.99) so we prefer basic triads if the math is EXACTLY tied,
        # but we DO NOT suppress real jazz/complex chords (which caused 4-second gaps!)
        for idx, name in enumerate(chord_names):
            if '7' in name or '9' in name or 'sus' in name:
                templates_norm[idx] = templates_norm[idx] * 0.99
                
        similarities = np.dot(templates_norm, chroma_norm)
        best_matches = np.argmax(similarities, axis=0)
        
        # We must use a MAJORITY (Mode) filter for categorical data
        # kernel_size = 3 means the window is 3 beats wide.
        # For a chord to survive, it must span at least 2 beats (a "halber Akkord" / half measure).
        kernel_size = 3
        
        smoothed_matches = np.copy(best_matches)
        pad = kernel_size // 2
        for i in range(len(best_matches)):
            start = max(0, i - pad)
            end = min(len(best_matches), i + pad + 1)
            window = best_matches[start:end]
            counts = np.bincount(window)
            smoothed_matches[i] = np.argmax(counts)
        best_matches = smoothed_matches
        
        # Build intervals based exactly on the beat grid
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        duration = librosa.get_duration(y=y, sr=sr)
        boundaries = [0.0] + list(beat_times) + [duration]
        
        # Pass 1: Raw Segments
        segments = []
        current_chord = chord_names[best_matches[0]]
        start_time = float(boundaries[0])
        
        for i in range(1, len(best_matches)):
            chord = chord_names[best_matches[i]]
            if chord != current_chord:
                segments.append({
                    "start": start_time,
                    "end": float(boundaries[i]),
                    "chord": current_chord
                })
                start_time = float(boundaries[i])
                current_chord = chord
                
        segments.append({
            "start": start_time,
            "end": float(boundaries[-1]),
            "chord": current_chord
        })
        
        # Pass 2: Explicitly absorb short passing chords.
        # Set to 1.8 beats to fiercely guarantee that ANY flutter (1-beat passing notes)
        # is deleted, even if the beat tracker fluctuates, while strictly preserving 2-beat chords.
        beat_duration = 60.0 / bpm if bpm > 0 else 0.5
        min_duration = beat_duration * 1.8 
        
        final_segments = []
        for seg in segments:
            seg_duration = seg["end"] - seg["start"]
            if seg_duration < min_duration and len(final_segments) > 0:
                final_segments[-1]["end"] = seg["end"]
            else:
                if len(final_segments) > 0 and final_segments[-1]["chord"] == seg["chord"]:
                    final_segments[-1]["end"] = seg["end"]
                else:
                    final_segments.append(seg)
        
        # Calculate Optimal Capo for Guitar
        easy_shapes = {'C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm'}
        notes_arr = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        best_capo = 0
        best_score = -1
        
        for capo in range(12):
            score = 0
            for seg in final_segments:
                chord = seg["chord"]
                root = chord[0]
                if len(chord) > 1 and chord[1] == '#':
                    root += '#'
                suffix = chord[len(root):]
                
                root_idx = notes_arr.index(root)
                trans_idx = (root_idx - capo) % 12
                trans_chord = notes_arr[trans_idx]
                
                # Treat maj7, add9 etc as their base major/minor for "easiness" evaluation
                if len(suffix) > 0 and suffix[0] == 'm' and not suffix.startswith('maj'):
                    trans_chord += 'm'
                    
                duration = seg["end"] - seg["start"]
                if trans_chord in easy_shapes:
                    score += duration
                    
            # Prefer lower capos if scores are tied
            score = score - (capo * 0.1)
            
            if score > best_score:
                best_score = score
                best_capo = capo
                
        # Format for JSON
        beat_duration = 60.0 / bpm if bpm > 0 else 0.5
        for seg in final_segments:
            seg_duration = seg["end"] - seg["start"]
            seg["beats"] = int(round(seg_duration / beat_duration))
            seg["start"] = round(seg["start"], 2)
            seg["end"] = round(seg["end"], 2)
            
        print(json.dumps({
            "status": "success", 
            "chords": final_segments,
            "bpm": round(bpm),
            "capo": best_capo
        }))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
