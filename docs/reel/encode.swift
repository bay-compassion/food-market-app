// Turns the frames from capture.cjs and the soundtrack into an H.264 MP4, with AVFoundation.
//
//   swiftc -O docs/reel/encode.swift -o docs/reel/out/encode
//   docs/reel/out/encode docs/reel/out/frames docs/reel/soundtrack.m4a docs/reel/out/market-day-reel.mp4 [bitrate]
//
// The bitrate defaults to 14 Mbps; about 2.9 Mbps gives a copy under 25 MB.
import AVFoundation
import AppKit

let args = CommandLine.arguments
let framesDir = URL(fileURLWithPath: args[1]), audioURL = URL(fileURLWithPath: args[2]), outURL = URL(fileURLWithPath: args[3])
let fps: Int32 = 30, width = 1920, height = 1080
let silentURL = outURL.deletingLastPathComponent().appendingPathComponent("silent-\(outURL.lastPathComponent)")
try? FileManager.default.removeItem(at: silentURL)
try? FileManager.default.removeItem(at: outURL)

let writer = try AVAssetWriter(outputURL: silentURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: args.count > 4 ? Int(args[4])! : 14_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let files = try FileManager.default.contentsOfDirectory(atPath: framesDir.path).filter { $0.hasSuffix(".jpg") }.sorted()
for (i, name) in files.enumerated() {
  autoreleasepool {
    guard let image = NSImage(contentsOf: framesDir.appendingPathComponent(name)),
          let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fatalError("bad frame \(name)") }
    var pb: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
    let buffer = pb!
    CVPixelBufferLockBaseAddress(buffer, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8,
                        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(),
                        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
  }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fatalError("video: \(String(describing: writer.error))") }

// Lay the soundtrack under the picture; the picture is copied as-is, the audio encoded to AAC.
let composition = AVMutableComposition()
let video = AVURLAsset(url: silentURL), audio = AVURLAsset(url: audioURL)
let sem = DispatchSemaphore(value: 0)
Task {
  do {
    let vTrack = try await video.loadTracks(withMediaType: .video)[0]
    let aTrack = try await audio.loadTracks(withMediaType: .audio)[0]
    let vDur = try await video.load(.duration)
    let range = CMTimeRange(start: .zero, duration: vDur)
    try composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(range, of: vTrack, at: .zero)
    try composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(range, of: aTrack, at: .zero)
    let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough)!
    // "Fast start": the index goes at the front, so a browser can begin playing before the end arrives.
    export.shouldOptimizeForNetworkUse = true
    try await export.export(to: outURL, as: .mp4)
    print("wrote", outURL.path, CMTimeGetSeconds(vDur), "s")
  } catch { print("mux error:", error) }
  sem.signal()
}
sem.wait()
