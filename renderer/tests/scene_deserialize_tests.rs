use renderer::material::Material;
use renderer::scene::{ObjectSpec, SceneFile};
use renderer::vec3::Vec3;

fn load(path: &str) -> SceneFile {
    let json = std::fs::read_to_string(path).expect("fixture file should exist");
    serde_json::from_str(&json).expect("fixture should be valid scene JSON")
}

#[test]
fn minimal_scene_parses_with_expected_shape() {
    let scene_file = load("tests/fixtures/minimal_scene.json");
    assert_eq!(scene_file.scene.objects.len(), 2);
    assert_eq!(scene_file.settings.width, 160);
    assert_eq!(scene_file.settings.height, 120);
    assert_eq!(scene_file.settings.max_samples, 16);

    match &scene_file.scene.objects[0] {
        ObjectSpec::Sphere { radius, material, .. } => {
            assert!((*radius - 0.5).abs() < 1e-9);
            assert!(matches!(material, Material::Lambertian { .. }));
        }
        other => panic!("expected the first object to be a sphere, got {other:?}"),
    }
}

#[test]
fn camera_up_defaults_to_positive_y_when_omitted() {
    let scene_file = load("tests/fixtures/minimal_scene.json");
    assert_eq!(scene_file.scene.camera.up, Vec3::new(0.0, 1.0, 0.0));
}

#[test]
fn cornell_box_parses_with_all_eight_objects() {
    let scene_file = load("tests/fixtures/cornell_box.json");
    assert_eq!(scene_file.scene.objects.len(), 8);

    let emissive_count = scene_file
        .scene
        .objects
        .iter()
        .filter(|obj| match obj {
            ObjectSpec::Plane { material, .. } => matches!(material, Material::Emissive { .. }),
            _ => false,
        })
        .count();
    assert_eq!(emissive_count, 1, "cornell box should have exactly one area light");
}

#[test]
fn reflective_spheres_preset_parses_and_builds() {
    let scene_file = load("tests/fixtures/reflective_spheres.json");
    assert_eq!(scene_file.scene.objects.len(), 5);

    let aspect_ratio = scene_file.settings.width as f64 / scene_file.settings.height as f64;
    let built = scene_file.scene.build(aspect_ratio);
    assert_eq!(built.lights.len(), 1);
    assert!(built.world.bounding_box().is_some());
}

#[test]
fn glass_sphere_preset_parses_and_contains_a_dielectric_material() {
    let scene_file = load("tests/fixtures/glass_sphere.json");
    let has_dielectric = scene_file.scene.objects.iter().any(|obj| {
        matches!(
            obj,
            ObjectSpec::Sphere {
                material: Material::Dielectric { .. },
                ..
            }
        )
    });
    assert!(has_dielectric, "glass_sphere preset should include a dielectric sphere");
}

#[test]
fn scene_build_produces_a_bounding_box_enclosing_every_object() {
    let scene_file = load("tests/fixtures/minimal_scene.json");
    let aspect_ratio = scene_file.settings.width as f64 / scene_file.settings.height as f64;
    let built = scene_file.scene.build(aspect_ratio);

    let bbox = built
        .world
        .bounding_box()
        .expect("a scene with objects must have a bounding box");
    // The larger emissive sphere sits at (0, 3, -1) with radius 0.3.
    assert!(bbox.max.y >= 3.3);
}

#[test]
fn missing_required_field_fails_to_deserialize() {
    let json = r#"{
        "scene": {
            "camera": { "position": {"x":0,"y":0,"z":0}, "look_at": {"x":0,"y":0,"z":-1} },
            "objects": []
        },
        "settings": { "width": 100, "height": 100, "max_samples": 10, "max_bounce_depth": 4 }
    }"#;
    // `vfov` is required and missing here.
    let result: Result<SceneFile, _> = serde_json::from_str(json);
    assert!(result.is_err());
}

#[test]
fn unknown_object_type_fails_to_deserialize() {
    let json = r#"{
        "scene": {
            "camera": { "position": {"x":0,"y":0,"z":0}, "look_at": {"x":0,"y":0,"z":-1}, "vfov": 40 },
            "objects": [
                { "type": "cube", "center": {"x":0,"y":0,"z":0} }
            ]
        },
        "settings": { "width": 100, "height": 100, "max_samples": 10, "max_bounce_depth": 4 }
    }"#;
    let result: Result<SceneFile, _> = serde_json::from_str(json);
    assert!(result.is_err());
}

#[test]
fn unknown_material_type_fails_to_deserialize() {
    let json = r#"{
        "scene": {
            "camera": { "position": {"x":0,"y":0,"z":0}, "look_at": {"x":0,"y":0,"z":-1}, "vfov": 40 },
            "objects": [
                {
                    "type": "sphere",
                    "center": {"x":0,"y":0,"z":-1},
                    "radius": 1.0,
                    "material": { "type": "plastic", "albedo": {"x":1,"y":1,"z":1} }
                }
            ]
        },
        "settings": { "width": 100, "height": 100, "max_samples": 10, "max_bounce_depth": 4 }
    }"#;
    let result: Result<SceneFile, _> = serde_json::from_str(json);
    assert!(result.is_err());
}
