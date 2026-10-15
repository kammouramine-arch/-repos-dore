Pod::Spec.new do |s|
  s.name = 'AvyroWake'
  s.version = '2.0.0'
  s.summary = 'Avyro offline foreground keyword detector'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Avyro'
  s.homepage = 'https://github.com/kammouramine-arch/-repos-dore'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.vendored_frameworks = 'vendor/*.xcframework'
  s.resource_bundles = { 'AvyroWakeModels' => ['models/*'], 'MeepmeepBrand' => ['resources/*'] }
  s.frameworks = 'AVFoundation', 'UIKit', 'CoreML', 'Accelerate', 'MapKit', 'Speech'
  s.libraries = 'c++'
  s.swift_version = '5.9'
end
