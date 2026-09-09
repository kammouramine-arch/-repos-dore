Pod::Spec.new do |s|
  s.name           = 'DeviseraStoreKit'
  s.version        = '1.0.0'
  s.summary        = 'Direct StoreKit 2 product inspection for DEVISERA support diagnostics.'
  s.description    = 'Queries StoreKit 2 directly, without any wrapper, so the app can compare what Apple returns with what the purchase library reports.'
  s.author         = 'DEVISERA'
  s.homepage       = 'https://devisera.fr'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
