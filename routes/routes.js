const { Router } = require("express");

const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const User = require("../models/user");

const Tasks = require("../models/tasks");

const router = Router();

router.post("/register", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let name = req.body.name;

  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  const record = await User.findOne({ email: email });

  if (record) {
    return res.status(400).send({
      message: "Email is already registered",
    });
  } else {
    const user = new User({
      name: name,
      email: email,
      password: hashedPassword,
    });

    const result = await user.save();

    // JWT Token

    const { _id } = await result.toJSON();

    const token = jwt.sign({ _id: _id }, "secret");

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.send({
      message: "success",
    });
  }
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).send({
      message: "User not Found",
    });
  }

  if (!(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(400).send({
      message: "Password is Incorrect",
    });
  }

  const token = jwt.sign({ _id: user._id }, "secret");

  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  res.send({
    message: "success",
  });
});

router.get("/user", async (req, res) => {
  try {
    const cookie = req.cookies["jwt"];

    const claims = jwt.verify(cookie, "secret");

    if (!claims) {
      return res.status(401).send({
        message: "unauthenticated",
      });
    }

    const user = await User.findOne({ _id: claims._id });

    const { password, ...data } = await user.toJSON();

    res.send(data);
  } catch (e) {
    return res.status(401).send({
      message: "unauthenticated",
    });
  }
});

router.post("/logout", (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });

  res.send({
    message: "success",
  });
});

// Task GET
router.get("/task", async (req, res) => {
  try {
    const tasks = await Tasks.find().exec();
    res.send(tasks);
  } catch (err) {
    console.log("Error occurred", err);
    res.status(400).send({
      message: "Internal Error Occurred",
    });
  }
});

//Get by Id
router.get("/task/:id", async (req, res) => {
  try {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const task = await Tasks.findById(req.params.id).exec();
      if (task) {
        res.send(task);
      } else {
        res.status(404).send("No record found for ID: " + req.params.id);
      }
    } else {
      res.status(400).send("Invalid ID format: " + req.params.id);
    }
  } catch (err) {
    console.log("Internal Error", err);
    res.status(500).send("Internal Error", err);
  }
});

// Task POST
router.post("/task", async (req, res) => {
  try {
    let task = new Tasks({
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
    });
    const doc = await task.save();
    res.send(doc);
  } catch (err) {
    console.log("Internal Error", err);
    res.status(400).send("Internal Error", err);
  }
});

// DELETE TASKS
router.delete("/task/:id", async (req, res) => {
  try {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const removedTask = await Tasks.findByIdAndRemove(req.params.id).exec();
      if (removedTask) {
        res.send(removedTask);
      } else {
        res.status(404).send("No record found for ID: " + req.params.id);
      }
    } else {
      res.status(400).send("Invalid ID format: " + req.params.id);
    }
  } catch (err) {
    console.log("Internal Error", err);
    res.status(500).send("Internal Error", err);
  }
});

// search
router.get("/task/search/:query", async (req, res) => {
  const { query } = req.params;

  try {
    const tasks = await Tasks.find({
      $or: [{ title: { $regex: query, $options: "i" } }, { description: { $regex: query, $options: "i" } }],
    }).exec();

    res.send(tasks);
  } catch (err) {
    console.log("Internal Error", err);
    res.status(500).send("Internal Error");
  }
});

// Update By id
router.put("/task/:id", async (req, res) => {
  try {
    let task = {
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
    };
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const updatedTask = await Tasks.findByIdAndUpdate(req.params.id, task, { new: true }).exec();
      if (updatedTask) {
        res.send(updatedTask);
      } else {
        res.status(404).send("No record found for ID: " + req.params.id);
      }
    } else {
      res.status(400).send("Invalid ID format: " + req.params.id);
    }
  } catch (err) {
    console.log("Internal Error", err);
    res.status(500).send("Internal Error", err);
  }
});

module.exports = router;
