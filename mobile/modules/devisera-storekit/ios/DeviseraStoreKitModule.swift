import ExpoModulesCore
import StoreKit

/**
 Direct StoreKit 2 read path, deliberately independent from expo-iap/openiap.

 It answers one question for support and for Apple: what does StoreKit itself
 return for our product identifiers on this device, right now? Only product
 catalogue metadata is exposed (identifiers, prices, currency, storefront,
 offer structure). No transaction, receipt, account or device identifier is
 read or returned.
 */
public class DeviseraStoreKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DeviseraStoreKit")

    AsyncFunction("inspectProducts") { (skus: [String]) async throws -> [String: Any] in
      guard #available(iOS 15.0, *) else {
        throw Exception(name: "STOREKIT2_UNAVAILABLE", description: "StoreKit 2 requires iOS 15 or later.")
      }
      return try await DeviseraStoreKitInspector.inspect(skus: skus)
    }
  }
}

@available(iOS 15.0, *)
enum DeviseraStoreKitInspector {
  static func inspect(skus: [String]) async throws -> [String: Any] {
    let storefront = await Storefront.current
    let products = try await Product.products(for: skus)
    var items: [[String: Any]] = []
    for product in products {
      var item: [String: Any] = [
        "id": product.id,
        "type": product.type.rawValue,
        "displayName": product.displayName,
        "displayPrice": product.displayPrice,
        "price": "\(product.price)",
        "currency": currencyCode(of: product),
        "priceLocale": product.priceFormatStyle.locale.identifier,
        "isFamilyShareable": product.isFamilyShareable,
      ]
      if let subscription = product.subscription {
        item["subscriptionGroupId"] = subscription.subscriptionGroupID
        item["periodUnit"] = "\(subscription.subscriptionPeriod.unit)"
        item["periodValue"] = subscription.subscriptionPeriod.value
        item["introEligible"] = await subscription.isEligibleForIntroOffer
        if let intro = subscription.introductoryOffer {
          item["intro"] = [
            "paymentMode": intro.paymentMode.rawValue,
            "displayPrice": intro.displayPrice,
            "periodUnit": "\(intro.period.unit)",
            "periodValue": intro.period.value,
            "periodCount": intro.periodCount,
          ] as [String: Any]
        } else {
          item["intro"] = NSNull()
        }
      }
      item["catalog"] = catalogSummary(product.jsonRepresentation)
      items.append(item)
    }
    let missing = skus.filter { sku in !products.contains { $0.id == sku } }
    return [
      "storefrontCountry": storefront?.countryCode ?? "",
      "storefrontId": storefront?.id ?? "",
      "requestedProductIds": skus,
      "missingProductIds": missing,
      "products": items,
      "inspectedAt": ISO8601DateFormatter().string(from: Date()),
    ]
  }

  /// Currency of the price format style StoreKit attached to the product: the
  /// same source the purchase library reads. Never the device locale.
  static func currencyCode(of product: Product) -> String {
    if #available(iOS 16.0, *) {
      return product.priceFormatStyle.currencyCode
    }
    return product.priceFormatStyle.locale.currencyCode ?? ""
  }

  /**
   Allowlisted view of the raw App Store catalogue entry behind the product.

   `jsonRepresentation` is the server response StoreKit built the product
   from. Its `href` names the catalogue storefront that served the metadata
   and each offer carries its own currency: this is the evidence that decides
   whether a wrong currency comes from Apple's catalogue answer or from a
   layer above it.
   */
  static func catalogSummary(_ data: Data) -> [String: Any] {
    guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return ["parsed": false]
    }
    var summary: [String: Any] = ["parsed": true, "topLevelKeys": Array(json.keys).sorted()]
    if let href = json["href"] as? String { summary["href"] = href }
    if let attributes = json["attributes"] as? [String: Any] {
      summary["attributeKeys"] = Array(attributes.keys).sorted()
      if let offers = attributes["offers"] as? [[String: Any]] {
        summary["offers"] = offers.map { offer -> [String: Any] in
          var entry: [String: Any] = [:]
          for key in ["currencyCode", "price", "priceFormatted", "recurringSubscriptionPeriod", "type", "buyParams"] {
            if let value = offer[key] as? String { entry[key] = key == "buyParams" ? "present" : value }
          }
          if let discounts = offer["discounts"] as? [[String: Any]] {
            entry["discounts"] = discounts.map { discount -> [String: Any] in
              var d: [String: Any] = [:]
              for key in ["type", "modeType", "price", "priceFormatted", "numOfPeriods", "recurringSubscriptionPeriod"] {
                if let value = discount[key] { d[key] = "\(value)" }
              }
              return d
            }
          }
          return entry
        }
      }
    }
    return summary
  }
}
